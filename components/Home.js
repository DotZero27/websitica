import Image from "next/image";

import Logo from "@/assets/SSN_IT.svg";

export default function Home() {
  return (
    <>
      <div className="flex justify-between px-4 py-3">
        <Image src={Logo} className="w-40 antialiased" alt="logo" />
        <div className="font-spicyRice text-primary text-4xl">WEBSITICA</div>
      </div>
    </>
  );
}
