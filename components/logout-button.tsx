"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logOut() {
    setPending(true);
    setError("");
    try {
      const result = await signOutAction();
      if (result.status === "error") {
        setError(result.message ?? "We could not log you out.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We could not log you out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="logout-wrap">
      <button className="text-button" type="button" onClick={() => void logOut()} disabled={pending}>
        {pending ? "Logging out…" : "Log out"}
      </button>
      {error && <span className="inline-error" role="alert">{error}</span>}
    </div>
  );
}
