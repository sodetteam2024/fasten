"use client";

import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACCENT = "#7B2AE6";

export default function RequestsToolbar({
    loading,
    canViewUnit,
    scope,
    onScopeChange,
    searchTerm,
    onSearchChange,
    filterStatus,
    onFilterChange,
    onNew,
}) {
    return (
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex flex-col sm:flex-row gap-3">
                {canViewUnit && (
                    <Select value={scope} onValueChange={onScopeChange}>
                        <SelectTrigger className="w-full sm:w-[190px]">
                            <SelectValue placeholder="Alcance" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mine">Mis solicitudes</SelectItem>
                            <SelectItem value="unit">Todas (unidad)</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <div className="relative w-full sm:w-[280px]">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por asunto o descripción..."
                        className="pl-9"
                        disabled={loading}
                    />
                </div>

                <Select value={filterStatus} onValueChange={onFilterChange}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="en_proceso">En proceso</SelectItem>
                        <SelectItem value="resuelta">Resuelta</SelectItem>
                        <SelectItem value="cerrada">Cerrada</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={onNew} disabled={loading} className="text-white" style={{ backgroundColor: ACCENT }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva
            </Button>
        </div>
    );
}
