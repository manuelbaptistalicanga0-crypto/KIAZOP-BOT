"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return <button className="icon-button signout-button" type="button" aria-label="Sair da conta" title="Sair" onClick={() => signOut({ callbackUrl: "/login" })}><LogOut size={17} /></button>;
}
