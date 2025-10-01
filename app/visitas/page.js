"use client";

import { useState } from "react";
import {
  Bell,
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Clock,
  Phone,
  CheckCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Visitas() {
  const [visitors, setVisitors] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    documentType: "",
    documentNumber: "",
    purpose: "",
    contact: "",
    status: "Pendiente",
    frequency: "Frecuente",
  });
  const [editingId, setEditingId] = useState(null);

  const handleAddOrUpdateVisitor = () => {
    if (!formData.name || !formData.documentType || !formData.documentNumber || !formData.purpose)
      return;

    if (editingId) {
      // Editar visita existente
      setVisitors(
        visitors.map((visitor) =>
          visitor.id === editingId ? { ...visitor, ...formData } : visitor
        )
      );
      setEditingId(null);
    } else {
      // Crear nueva visita
      setVisitors([
        ...visitors,
        {
          id: Date.now(),
          ...formData,
          date: new Date().toLocaleDateString(),
        },
      ]);
    }

    setFormData({
      name: "",
      documentType: "",
      documentNumber: "",
      purpose: "",
      contact: "",
      status: "Pendiente",
      frequency: "Frecuente",
    });
  };

  const handleDelete = (id) => {
    setVisitors(visitors.filter((visitor) => visitor.id !== id));
  };

  const handleStatusChange = (id, status) => {
    setVisitors(
      visitors.map((visitor) =>
        visitor.id === id ? { ...visitor, status } : visitor
      )
    );
  };

  const handleEdit = (visitor) => {
    setFormData({ ...visitor });
    setEditingId(visitor.id);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700 flex items-center gap-2">
          <Users className="h-8 w-8" /> Registro de Visitas
        </h1>
        <Button className="flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notificaciones
        </Button>
      </div>

      {/* Formulario */}
      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle>
            {editingId ? "Editar visita" : "Registrar nueva visita"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre completo del visitante"
            />
          </div>
          <div>
            <Label>Tipo de Documento</Label>
            <Select
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, documentType: value }))
              }
              value={formData.documentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                <SelectItem value="PAS">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Número de Documento</Label>
            <Input
              value={formData.documentNumber}
              onChange={(e) =>
                setFormData({ ...formData, documentNumber: e.target.value })
              }
              placeholder="Número de documento"
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <Textarea
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              placeholder="Motivo de la visita"
            />
          </div>
          <div>
            <Label>Contacto</Label>
            <Input
              value={formData.contact}
              onChange={(e) =>
                setFormData({ ...formData, contact: e.target.value })
              }
              placeholder="Teléfono o email"
            />
          </div>
          <div>
            <Label>Frecuencia</Label>
            <Select
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, frequency: value }))
              }
              value={formData.frequency}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Frecuente">Frecuente</SelectItem>
                <SelectItem value="Proveedor">Proveedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddOrUpdateVisitor}>
            {editingId ? "Guardar cambios" : "Agregar visita"}
          </Button>
        </CardContent>
      </Card>

      {/* Filtro */}
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="Buscar visitante..." className="w-1/2" />
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      {/* Lista de visitas */}
      {visitors.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">
          No hay visitas registradas.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visitors.map((visitor) => (
            <Card key={visitor.id} className="shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{visitor.name}</span>
                  <Badge
                    className={`${
                      visitor.status === "Aprobada"
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  >
                    {visitor.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  <strong>Documento:</strong> {visitor.documentType}{" "}
                  {visitor.documentNumber}
                </p>
                <p>
                  <Clock className="inline h-4 w-4 mr-1" /> {visitor.date}
                </p>
                <p>{visitor.purpose}</p>
                <p>
                  <Phone className="inline h-4 w-4 mr-1" /> {visitor.contact}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleStatusChange(visitor.id, "Aprobada")
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(visitor)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(visitor.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
