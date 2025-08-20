import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
// Componentes UI disponibles
// import { Separator } from '../ui/separator'; // No disponible
// import { Calendar } from '../ui/calendar'; // No disponible
// import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'; // No disponible
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  Search,
  RotateCcw,
  Save,
  FolderOpen,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface FiltroAvanzado {
  id: string;
  campo: string;
  operador: 'igual' | 'contiene' | 'mayor' | 'menor' | 'entre' | 'en';
  valor: any;
  activo: boolean;
  tipo: 'texto' | 'numero' | 'fecha' | 'select' | 'multiselect';
  opciones?: { label: string; value: string }[];
}

interface RangoFecha {
  desde: Date | null;
  hasta: Date | null;
}

interface FiltrosGuardados {
  id: string;
  nombre: string;
  filtros: FiltroAvanzado[];
  fechaCreacion: Date;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filtros: FiltroAvanzado[]) => void;
  onDateRangeChange: (rango: RangoFecha) => void;
  className?: string;
  campos?: { campo: string; label: string; tipo: string; opciones?: any[] }[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFiltersChange,
  onDateRangeChange,
  className,
  campos = []
}) => {
  const [filtros, setFiltros] = useState<FiltroAvanzado[]>([]);
  const [rangoFecha, setRangoFecha] = useState<RangoFecha>({ desde: null, hasta: null });
  const [filtrosGuardados, setFiltrosGuardados] = useState<FiltrosGuardados[]>([]);
  const [nombreFiltroGuardar, setNombreFiltroGuardar] = useState('');
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [busquedaRapida, setBusquedaRapida] = useState('');
  // const [fechaCalendarOpen, setFechaCalendarOpen] = useState<'desde' | 'hasta' | null>(null); // Ya no se usa

  // Campos predeterminados si no se proporcionan
  const camposDisponibles = campos.length > 0 ? campos : [
    { campo: 'material', label: 'Material', tipo: 'texto' },
    { campo: 'categoria', label: 'Categoría', tipo: 'select', opciones: [
      { label: 'Construcción', value: 'construccion' },
      { label: 'Herramientas', value: 'herramientas' },
      { label: 'Equipos', value: 'equipos' },
      { label: 'Consumibles', value: 'consumibles' }
    ]},
    { campo: 'obra', label: 'Obra', tipo: 'select', opciones: [
      { label: 'Obra A', value: 'obra_a' },
      { label: 'Obra B', value: 'obra_b' },
      { label: 'Obra C', value: 'obra_c' }
    ]},
    { campo: 'proveedor', label: 'Proveedor', tipo: 'texto' },
    { campo: 'cantidad', label: 'Cantidad', tipo: 'numero' },
    { campo: 'precio', label: 'Precio', tipo: 'numero' },
    { campo: 'estado', label: 'Estado', tipo: 'select', opciones: [
      { label: 'Activo', value: 'activo' },
      { label: 'Inactivo', value: 'inactivo' },
      { label: 'Agotado', value: 'agotado' }
    ]}
  ];

  // Rangos de fecha predefinidos
  const rangosFechaPredefinidos = [
    { label: 'Hoy', valor: () => ({ desde: startOfDay(new Date()), hasta: endOfDay(new Date()) }) },
    { label: 'Ayer', valor: () => ({ desde: startOfDay(subDays(new Date(), 1)), hasta: endOfDay(subDays(new Date(), 1)) }) },
    { label: 'Últimos 7 días', valor: () => ({ desde: startOfDay(subDays(new Date(), 7)), hasta: endOfDay(new Date()) }) },
    { label: 'Últimos 30 días', valor: () => ({ desde: startOfDay(subDays(new Date(), 30)), hasta: endOfDay(new Date()) }) },
    { label: 'Este mes', valor: () => ({ desde: startOfDay(subDays(new Date(), new Date().getDate() - 1)), hasta: endOfDay(new Date()) }) },
    { label: 'Mes pasado', valor: () => ({ desde: startOfDay(subMonths(new Date(), 1)), hasta: endOfDay(subDays(new Date(), new Date().getDate())) }) },
    { label: 'Este año', valor: () => ({ desde: startOfDay(new Date(new Date().getFullYear(), 0, 1)), hasta: endOfDay(new Date()) }) }
  ];

  useEffect(() => {
    onFiltersChange(filtros.filter(f => f.activo));
  }, [filtros, onFiltersChange]);

  useEffect(() => {
    onDateRangeChange(rangoFecha);
  }, [rangoFecha, onDateRangeChange]);

  useEffect(() => {
    // Cargar filtros guardados del localStorage
    const filtrosGuardadosStorage = localStorage.getItem('filtrosGuardados');
    if (filtrosGuardadosStorage) {
      setFiltrosGuardados(JSON.parse(filtrosGuardadosStorage));
    }
  }, []);

  const agregarFiltro = () => {
    const nuevoFiltro: FiltroAvanzado = {
      id: `filtro_${Date.now()}`,
      campo: camposDisponibles[0].campo,
      operador: 'igual',
      valor: '',
      activo: true,
      tipo: camposDisponibles[0].tipo as any,
      opciones: camposDisponibles[0].opciones
    };
    
    setFiltros([...filtros, nuevoFiltro]);
  };

  const actualizarFiltro = (id: string, campo: keyof FiltroAvanzado, valor: any) => {
    setFiltros(filtros.map(filtro => {
      if (filtro.id === id) {
        const campoInfo = camposDisponibles.find(c => c.campo === valor);
        if (campo === 'campo' && campoInfo) {
          return {
            ...filtro,
            [campo]: valor,
            tipo: campoInfo.tipo as any,
            opciones: campoInfo.opciones,
            valor: '' // Reset valor cuando cambia el campo
          };
        }
        return { ...filtro, [campo]: valor };
      }
      return filtro;
    }));
  };

  const eliminarFiltro = (id: string) => {
    setFiltros(filtros.filter(f => f.id !== id));
  };

  const limpiarFiltros = () => {
    setFiltros([]);
    setRangoFecha({ desde: null, hasta: null });
    setBusquedaRapida('');
  };

  const aplicarRangoFechaPredefinido = (rango: () => RangoFecha) => {
    const nuevoRango = rango();
    setRangoFecha(nuevoRango);
  };

  const guardarFiltros = () => {
    if (!nombreFiltroGuardar.trim()) return;
    
    const nuevoFiltroGuardado: FiltrosGuardados = {
      id: `guardado_${Date.now()}`,
      nombre: nombreFiltroGuardar,
      filtros: filtros.filter(f => f.activo),
      fechaCreacion: new Date()
    };
    
    const nuevosGuardados = [...filtrosGuardados, nuevoFiltroGuardado];
    setFiltrosGuardados(nuevosGuardados);
    localStorage.setItem('filtrosGuardados', JSON.stringify(nuevosGuardados));
    setNombreFiltroGuardar('');
  };

  const cargarFiltrosGuardados = (filtrosGuardado: FiltrosGuardados) => {
    setFiltros(filtrosGuardado.filtros);
  };

  const eliminarFiltrosGuardados = (id: string) => {
    const nuevosGuardados = filtrosGuardados.filter(f => f.id !== id);
    setFiltrosGuardados(nuevosGuardados);
    localStorage.setItem('filtrosGuardados', JSON.stringify(nuevosGuardados));
  };

  const getOperadoresPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'texto':
        return [
          { value: 'igual', label: 'Igual a' },
          { value: 'contiene', label: 'Contiene' }
        ];
      case 'numero':
        return [
          { value: 'igual', label: 'Igual a' },
          { value: 'mayor', label: 'Mayor que' },
          { value: 'menor', label: 'Menor que' },
          { value: 'entre', label: 'Entre' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'igual', label: 'Igual a' },
          { value: 'en', label: 'En' }
        ];
      case 'fecha':
        return [
          { value: 'igual', label: 'Igual a' },
          { value: 'mayor', label: 'Después de' },
          { value: 'menor', label: 'Antes de' },
          { value: 'entre', label: 'Entre' }
        ];
      default:
        return [{ value: 'igual', label: 'Igual a' }];
    }
  };

  const renderCampoValor = (filtro: FiltroAvanzado) => {
    switch (filtro.tipo) {
      case 'select':
        return (
          <Select
            value={filtro.valor}
            onValueChange={(value) => actualizarFiltro(filtro.id, 'valor', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {filtro.opciones?.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'numero':
        return (
          <Input
            type="number"
            value={filtro.valor}
            onChange={(e) => actualizarFiltro(filtro.id, 'valor', e.target.value)}
            placeholder="Valor numérico"
          />
        );
      
      case 'fecha':
        return (
          <Input
            type="date"
            value={filtro.valor ? new Date(filtro.valor).toISOString().split('T')[0] : ''}
            onChange={(e) => actualizarFiltro(filtro.id, 'valor', e.target.value ? new Date(e.target.value).toISOString() : '')}
            placeholder="Seleccionar fecha"
          />
        );
      
      default:
        return (
          <Input
            value={filtro.valor}
            onChange={(e) => actualizarFiltro(filtro.id, 'valor', e.target.value)}
            placeholder="Valor de búsqueda"
          />
        );
    }
  };

  const filtrosActivos = filtros.filter(f => f.activo);
  const tieneFiltrosActivos = filtrosActivos.length > 0 || rangoFecha.desde || rangoFecha.hasta || busquedaRapida;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros Avanzados</span>
            {tieneFiltrosActivos && (
              <Badge variant="secondary" className="ml-2">
                {filtrosActivos.length + (rangoFecha.desde ? 1 : 0) + (busquedaRapida ? 1 : 0)} activos
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            >
              {mostrarFiltrosAvanzados ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {tieneFiltrosActivos && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Búsqueda rápida */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Búsqueda rápida..."
            value={busquedaRapida}
            onChange={(e) => setBusquedaRapida(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Rango de fechas */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Rango de Fechas</Label>
          
          {/* Rangos predefinidos */}
          <div className="flex flex-wrap gap-2">
            {rangosFechaPredefinidos.map((rango) => (
              <Button
                key={rango.label}
                variant="outline"
                size="sm"
                onClick={() => aplicarRangoFechaPredefinido(rango.valor)}
                className="text-xs"
              >
                {rango.label}
              </Button>
            ))}
          </div>
          
          {/* Selección manual de fechas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={rangoFecha.desde ? rangoFecha.desde.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  setRangoFecha({ ...rangoFecha, desde: e.target.value ? new Date(e.target.value) : null });
                }}
                placeholder="Fecha inicio"
              />
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={rangoFecha.hasta ? rangoFecha.hasta.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  setRangoFecha({ ...rangoFecha, hasta: e.target.value ? new Date(e.target.value) : null });
                }}
                placeholder="Fecha fin"
              />
            </div>
          </div>
        </div>

        {mostrarFiltrosAvanzados && (
          <>
            <div className="border-t my-4" />
            
            {/* Filtros personalizados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Filtros Personalizados</Label>
                <Button variant="outline" size="sm" onClick={agregarFiltro}>
                  <Filter className="h-4 w-4 mr-2" />
                  Agregar Filtro
                </Button>
              </div>
              
              {filtros.map((filtro) => (
                <div key={filtro.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  {/* Campo */}
                  <div className="col-span-3">
                    <Label className="text-xs text-muted-foreground">Campo</Label>
                    <Select
                      value={filtro.campo}
                      onValueChange={(value) => actualizarFiltro(filtro.id, 'campo', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {camposDisponibles.map((campo) => (
                          <SelectItem key={campo.campo} value={campo.campo}>
                            {campo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Operador */}
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Operador</Label>
                    <Select
                      value={filtro.operador}
                      onValueChange={(value) => actualizarFiltro(filtro.id, 'operador', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperadoresPorTipo(filtro.tipo).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Valor */}
                  <div className="col-span-5">
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    {renderCampoValor(filtro)}
                  </div>
                  
                  {/* Activo/Eliminar */}
                  <div className="col-span-2 flex items-center space-x-1">
                    <Button
                      variant={filtro.activo ? "default" : "outline"}
                      size="sm"
                      onClick={() => actualizarFiltro(filtro.id, 'activo', !filtro.activo)}
                      className="flex-1"
                    >
                      {filtro.activo ? 'ON' : 'OFF'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarFiltro(filtro.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Filtros guardados */}
            {(filtrosGuardados.length > 0 || filtrosActivos.length > 0) && (
              <>
                <div className="border-t my-4" />
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Filtros Guardados</Label>
                  
                  {/* Guardar filtros actuales */}
                  {filtrosActivos.length > 0 && (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Nombre para guardar filtros..."
                        value={nombreFiltroGuardar}
                        onChange={(e) => setNombreFiltroGuardar(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={guardarFiltros} disabled={!nombreFiltroGuardar.trim()}>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                    </div>
                  )}
                  
                  {/* Lista de filtros guardados */}
                  {filtrosGuardados.length > 0 && (
                    <div className="space-y-2">
                      {filtrosGuardados.map((filtroGuardado) => (
                        <div key={filtroGuardado.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{filtroGuardado.nombre}</span>
                              <p className="text-xs text-muted-foreground">
                                {filtroGuardado.filtros.length} filtros - {format(filtroGuardado.fechaCreacion, 'dd/MM/yyyy', { locale: es })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cargarFiltrosGuardados(filtroGuardado)}
                            >
                              Cargar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarFiltrosGuardados(filtroGuardado.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
export type { FiltroAvanzado, RangoFecha, FiltrosGuardados };