"use client";

import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// O campo de senha com mostrar e ocultar, com nome acessível no botão (docs/layout.md, seções 5.1
// e 6; CA-12). O ref do React Hook Form passa pelas props até o <input>.
export function PasswordInput({ id, className, ...props }: ComponentProps<"input">) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <Input id={id} type={shown ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
        aria-controls={id}
        onClick={() => setShown((current) => !current)}
        className="absolute inset-y-0 right-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}
