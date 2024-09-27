import { signOut } from "@/app/_actions/user";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export default function Logout() {
  return (
    <form action={signOut} className="flex">
      <Button className="flex gap-2 items-center" variant="destructive">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>Logout</span>
      </Button>
    </form>
  );
}
