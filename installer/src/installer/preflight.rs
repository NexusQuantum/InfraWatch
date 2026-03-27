use crate::app::{CheckItem, InstallConfig};

pub fn run_preflight_checks(config: &InstallConfig) -> Vec<CheckItem> {
    let mut checks = vec![
        check_architecture(),
        check_os(),
        check_memory(),
        check_disk_space(config),
        check_required_commands(),
        check_port_available(config.http_port, "HTTP"),
    ];
    if config.mode.includes_database() {
        checks.push(check_port_available(config.db_port, "PostgreSQL"));
    }
    checks.push(check_root_or_sudo());

    checks
}

fn check_architecture() -> CheckItem {
    let arch = std::env::consts::ARCH;
    match arch {
        "x86_64" | "aarch64" => CheckItem::success("Architecture", format!("{} supported", arch)),
        _ => CheckItem::error(
            "Architecture",
            format!("{} is not supported (need x86_64 or aarch64)", arch),
        ),
    }
}

fn check_os() -> CheckItem {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        let name = content
            .lines()
            .find(|l| l.starts_with("PRETTY_NAME="))
            .map(|l| l.trim_start_matches("PRETTY_NAME=").trim_matches('"'))
            .unwrap_or("Unknown");

        let id = content
            .lines()
            .find(|l| l.starts_with("ID="))
            .map(|l| l.trim_start_matches("ID=").trim_matches('"'))
            .unwrap_or("");

        match id {
            "ubuntu" | "debian" | "rhel" | "centos" | "rocky" | "almalinux" | "fedora" => {
                CheckItem::success("Operating System", name.to_string())
            }
            _ => CheckItem::warning(
                "Operating System",
                format!("{} — not officially tested", name),
            ),
        }
    } else {
        CheckItem::warning("Operating System", "Could not detect OS")
    }
}

fn check_memory() -> CheckItem {
    let sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new().with_memory(sysinfo::MemoryRefreshKind::everything()),
    );
    let total_mb = sys.total_memory() / 1024 / 1024;

    if total_mb >= 2048 {
        CheckItem::success("Memory", format!("{} MB available", total_mb))
    } else if total_mb >= 1024 {
        CheckItem::warning(
            "Memory",
            format!("{} MB available (2048 MB recommended)", total_mb),
        )
    } else {
        CheckItem::error(
            "Memory",
            format!("{} MB available (minimum 1024 MB required)", total_mb),
        )
    }
}

fn check_disk_space(config: &InstallConfig) -> CheckItem {
    let path = config
        .install_dir
        .parent()
        .unwrap_or(std::path::Path::new("/"));

    let disks = sysinfo::Disks::new_with_refreshed_list();
    let mut best_match: Option<(usize, u64)> = None;

    for disk in disks.list() {
        let mount = disk.mount_point();
        let path_str = path.to_string_lossy();
        let mount_str = mount.to_string_lossy();
        if path_str.starts_with(mount_str.as_ref()) {
            let mount_len = mount_str.len();
            if best_match.is_none() || mount_len > best_match.unwrap().0 {
                best_match = Some((mount_len, disk.available_space()));
            }
        }
    }

    let available_gb = best_match.map(|(_, b)| b / 1024 / 1024 / 1024).unwrap_or(0);

    if available_gb >= 5 {
        CheckItem::success("Disk Space", format!("{} GB available", available_gb))
    } else if available_gb >= 2 {
        CheckItem::warning(
            "Disk Space",
            format!("{} GB available (5 GB recommended)", available_gb),
        )
    } else {
        CheckItem::error(
            "Disk Space",
            format!("{} GB available (minimum 2 GB required)", available_gb),
        )
    }
}

fn check_required_commands() -> CheckItem {
    let required = ["curl", "git"];
    let missing: Vec<&str> = required
        .iter()
        .filter(|cmd| !super::command_exists(cmd))
        .copied()
        .collect();

    if missing.is_empty() {
        CheckItem::success("Required Commands", "curl, git found")
    } else {
        CheckItem::error(
            "Required Commands",
            format!("Missing: {}", missing.join(", ")),
        )
    }
}

fn check_port_available(port: u16, name: &str) -> CheckItem {
    match std::net::TcpListener::bind(format!("0.0.0.0:{}", port)) {
        Ok(_) => CheckItem::success(format!("Port {} ({})", port, name), "Available"),
        Err(_) => CheckItem::warning(
            format!("Port {} ({})", port, name),
            "In use (may be expected if service is already running)",
        ),
    }
}

fn check_root_or_sudo() -> CheckItem {
    if super::is_root() {
        CheckItem::success("Privileges", "Running as root")
    } else if super::command_exists("sudo") {
        CheckItem::warning(
            "Privileges",
            "Not root — sudo will be used for system operations",
        )
    } else {
        CheckItem::error("Privileges", "Not root and sudo not found — run as root")
    }
}
