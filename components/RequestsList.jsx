"use client";

import RequestCard from "./RequestCard";

export default function RequestsList({ loading, requests, onOpenEvidence, isAdmin, canReply, onReply }) {
    if (loading) {
        return (
            <div className="p-6 rounded-2xl border bg-card text-foreground shadow-sm dark:shadow-none">
                <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
        );
    }

    if (!requests?.length) {
        return (
            <div className="p-6 rounded-2xl border bg-card text-foreground shadow-sm dark:shadow-none">
                <p className="text-sm text-muted-foreground">No hay solicitudes para mostrar.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 mt-6">
            {requests.map((r) => (
                <RequestCard
                    key={r.id}
                    request={r}
                    onOpenEvidence={onOpenEvidence}
                    isAdmin={isAdmin}
                    canReply={canReply}
                    onReply={onReply}
                />
            ))}
        </div>
    );
}
