"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

const EULA_VERSION = "1.0";

const EULA_EN = `END USER LICENSE AGREEMENT (EULA)
NEXUS QUANTUM TECH
Product: Nexus Quantum Rust Platform

This End User License Agreement ("Agreement") is a legal agreement between the User ("User") and Nexus Quantum Tech as the technology owner and copyright holder of the software branded Nexus Quantum Rust ("Software").

By installing, accessing, or using this Software, the User is deemed to have read, understood, and agreed to all terms of this Agreement. If the User does not agree to these terms, the installation and use of the Software must be discontinued immediately.

ARTICLE 1 – INTELLECTUAL PROPERTY RIGHTS
All copyrights, patents, trade secrets, algorithms, source code, object code, analytic engines, AI models, system designs, documentation, and all components of the Software are the exclusive property of Nexus Quantum Tech. This Agreement does not grant ownership rights to the User regarding the Software, but only a limited right of use.

ARTICLE 2 – LICENSE GRANT
Nexus Quantum Tech grants the User a limited, non-exclusive, non-transferable, and non-sublicensable license to use the Software according to the number of licenses granted. This license is not a sale of the product.

ARTICLE 3 – INSTALLATION AND ACTIVATION RESTRICTIONS
The Software may only be installed according to the number of valid licenses. The Software may utilize protection mechanisms such as license activation, machine fingerprinting, hardware binding, license keys, online validation, or other protection mechanisms. Installation beyond the number of valid licenses is considered a violation.

ARTICLE 4 – PROHIBITION ON PIRACY AND MODIFICATION
The User is prohibited from duplicating, distributing, reselling, reverse engineering, decompiling, modifying the Software, removing license protections, or creating derivative versions without permission.

ARTICLE 5 – RIGHT TO AUDIT USAGE
Nexus Quantum Tech reserves the right to audit Software usage to ensure license compliance.

ARTICLE 6 – TELEMETRY AND SYSTEM VALIDATION
The Software may transmit limited technical data for license validation, including license status, device identification, number of installations, software version, and technical error data. The User's business operational data will not be transmitted without permission.

ARTICLE 7 – USER OBLIGATIONS
The User is obliged to use the Software lawfully, maintain the confidentiality of the license, not misuse the Software, and comply with Nexus Quantum Tech's provisions.

ARTICLE 8 – VIOLATIONS AND PENALTIES
In the event of a license violation, Nexus Quantum Tech reserves the right to deactivate the license, terminate usage, block activation, claim damages, and take legal action.

ARTICLE 9 – SOFTWARE UPDATES
The Software may receive automatic or manual updates for security improvements, features, and system stability.

ARTICLE 10 – LIMITATION OF LIABILITY
The Software is provided on an "AS IS" basis. Nexus Quantum Tech is not liable for business losses, data loss, or operational disruptions resulting from the use of the Software.

ARTICLE 11 – TERMINATION OF LICENSE
The license may be terminated if a violation occurs or if the license expires. The User must cease use and remove the Software upon termination.

ARTICLE 12 – GOVERNING LAW
This Agreement is subject to the laws of the Republic of Indonesia.

ARTICLE 13 – ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the User and Nexus Quantum Tech regarding the use of the Software.`;

const EULA_ID = `PERJANJIAN LISENSI PENGGUNA AKHIR (EULA)
NEXUS QUANTUM TECH
Produk: Nexus Quantum Rust Platform

Perjanjian Lisensi Pengguna Akhir ini ("Perjanjian") merupakan perjanjian hukum antara Pengguna ("Pengguna") dan Nexus Quantum Tech sebagai pemilik teknologi dan pemegang hak cipta perangkat lunak bermerek Nexus Quantum Rust ("Software").

Dengan menginstal, mengakses, atau menggunakan Software ini, Pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan perjanjian ini. Apabila Pengguna tidak menyetujui ketentuan ini, instalasi dan penggunaan Software harus dihentikan.

PASAL 1 – KEPEMILIKAN HAK KEKAYAAN INTELEKTUAL
Seluruh hak cipta, hak paten, rahasia dagang, algoritma, source code, object code, engine analitik, model AI, desain sistem, dokumentasi, serta seluruh komponen Software merupakan hak milik eksklusif Nexus Quantum Tech. Perjanjian ini tidak memberikan hak kepemilikan kepada Pengguna atas Software, melainkan hanya hak penggunaan terbatas.

PASAL 2 – PEMBERIAN LISENSI
Nexus Quantum Tech memberikan kepada Pengguna lisensi terbatas, non-eksklusif, tidak dapat dipindahtangankan, dan tidak dapat disublisensikan untuk menggunakan Software sesuai jumlah lisensi yang diberikan. Lisensi ini bukan merupakan penjualan produk.

PASAL 3 – PEMBATASAN INSTALASI DAN AKTIVASI
Software hanya boleh diinstal sesuai jumlah lisensi yang sah. Software dapat menggunakan mekanisme proteksi seperti aktivasi lisensi, fingerprinting perangkat, pengikatan hardware, kunci lisensi, validasi online, atau mekanisme proteksi lainnya.

PASAL 4 – LARANGAN PEMBAJAKAN DAN MODIFIKASI
Pengguna dilarang menduplikasi, mendistribusikan, menjual kembali, melakukan reverse engineering, dekompilasi, memodifikasi Software, menghapus proteksi lisensi, atau membuat versi turunan tanpa izin.

PASAL 5 – HAK AUDIT PENGGUNAAN
Nexus Quantum Tech berhak melakukan audit penggunaan Software untuk memastikan kepatuhan lisensi.

PASAL 6 – TELEMETRI DAN VALIDASI SISTEM
Software dapat mengirimkan data teknis terbatas untuk validasi lisensi. Data operasional bisnis Pengguna tidak akan dikirimkan tanpa izin.

PASAL 7 – KEWAJIBAN PENGGUNA
Pengguna wajib menggunakan Software secara sah, menjaga kerahasiaan lisensi, tidak menyalahgunakan Software, dan mematuhi ketentuan Nexus Quantum Tech.

PASAL 8 – PELANGGARAN DAN SANKSI
Dalam hal pelanggaran lisensi, Nexus Quantum Tech berhak menonaktifkan lisensi, menghentikan penggunaan, memblokir aktivasi, menuntut ganti rugi, dan mengambil tindakan hukum.

PASAL 9 – PEMBARUAN SOFTWARE
Software dapat menerima pembaruan otomatis atau manual untuk peningkatan keamanan, fitur, dan stabilitas sistem.

PASAL 10 – BATASAN TANGGUNG JAWAB
Software disediakan dalam kondisi "APA ADANYA". Nexus Quantum Tech tidak bertanggung jawab atas kerugian bisnis, kehilangan data, atau gangguan operasional yang diakibatkan penggunaan Software.

PASAL 11 – PENGAKHIRAN LISENSI
Lisensi dapat diakhiri jika terjadi pelanggaran atau jika lisensi kedaluwarsa. Pengguna harus menghentikan penggunaan dan menghapus Software setelah pengakhiran.

PASAL 12 – HUKUM YANG BERLAKU
Perjanjian ini tunduk pada hukum Republik Indonesia.`;

export default function SetupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "id">("en");
  const [agreed, setAgreed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If EULA already accepted, go to license page
    if (typeof window !== "undefined") {
      if (localStorage.getItem("nqrust_eula_accepted") === EULA_VERSION) {
        router.replace("/setup/license");
        return;
      }
    }
    setChecking(false);
  }, [router]);

  function handleAccept() {
    localStorage.setItem("nqrust_eula_accepted", EULA_VERSION);
    router.push("/setup/license");
  }

  if (checking) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-lg bg-muted mb-3">
            <Image
              src="/logo/nq-logo.png"
              alt="NQRust logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-sm"
              priority
            />
          </div>
          <h1 className="text-xl font-semibold">End User License Agreement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please read and accept the agreement before continuing.
          </p>
        </div>

        <Card className="p-6">
          {/* Language toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={lang === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLang("en")}
            >
              English
            </Button>
            <Button
              variant={lang === "id" ? "default" : "outline"}
              size="sm"
              onClick={() => setLang("id")}
            >
              Bahasa Indonesia
            </Button>
          </div>

          {/* EULA content */}
          <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/30">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground">
              {lang === "en" ? EULA_EN : EULA_ID}
            </pre>
          </ScrollArea>

          {/* Accept checkbox */}
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(!!checked)}
            />
            <span className="text-sm">
              I have read and agree to the End User License Agreement
            </span>
          </label>

          <Button
            className="w-full mt-4"
            disabled={!agreed}
            onClick={handleAccept}
          >
            <FileText className="h-4 w-4 mr-2" />
            Accept & Continue
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          NQRust-InfraWatch &copy; Nexus Quantum Tech
        </p>
      </div>
    </div>
  );
}
