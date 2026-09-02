"use client";

import { Check, Copy, Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatRoleLabel, type AssignableRole } from "@/lib/admin/roles";

type CreatedUser = {
  id: string;
  name: string;
  email: string;
  role: AssignableRole;
};

// La contraseña vive únicamente en el estado de este componente de
// cliente, recibida una única vez en la respuesta de la Server Action de
// creación (Fase 6.1 §9). No se guarda en ningún sitio, no se vuelve a
// pedir: si el admin navega fuera sin copiarla, no hay forma de
// recuperarla — es la propiedad de seguridad que se busca.
export function TemporaryPasswordReveal({
  user,
  temporaryPassword,
  onCreateAnother,
}: {
  user: CreatedUser;
  temporaryPassword: string;
  onCreateAnother: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // Copia únicamente en el cliente (Clipboard API del navegador): la
      // contraseña nunca vuelve a viajar a ningún servidor para copiarla.
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro):
      // no hay nada más seguro que ofrecer como alternativa aquí, así que
      // simplemente no se marca como copiado.
    }
  }

  return (
    <div className="max-w-md border border-ink">
      <div className="border-b border-ink bg-stamp-soft px-5 py-3">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-stamp-ink">
          Usuario creado
        </span>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5 font-mono text-sm">
        <div>
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">Nombre</div>
          <div className="mt-0.5 text-ink">{user.name}</div>
        </div>
        <div>
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">Correo</div>
          <div className="mt-0.5 text-ink">{user.email}</div>
        </div>
        <div>
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">Rol</div>
          <div className="mt-0.5 text-ink">{formatRoleLabel(user.role)}</div>
        </div>

        <div>
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Contraseña temporal
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto border border-line-strong bg-paper px-3 py-2 text-sm tracking-wider text-ink">
              {visible ? temporaryPassword : "•".repeat(temporaryPassword.length)}
            </code>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="border border-line-strong p-2.5 text-ink-dim transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
            >
              {visible ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar contraseña"
              className="border border-line-strong p-2.5 text-ink-dim transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="mt-2 text-xs normal-case tracking-normal text-ink-faint" role="status">
            {copied ? "Copiada al portapapeles. " : ""}
            Esta contraseña solo se mostrará ahora. Comunícala al usuario de
            forma segura — no queda guardada en ningún sitio.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full justify-center"
          onClick={onCreateAnother}
        >
          Crear otro usuario
        </Button>
      </div>
    </div>
  );
}
