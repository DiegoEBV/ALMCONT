import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Plus, Search, Filter, MoreVertical, Edit, Copy, Trash2, Eye, Download, FileText, Tag } from 'lucide-react';
import { toast } from 'sonner';
import TemplateEditor from '../components/templates/TemplateEditor';
import { Template, TemplateService, TemplateInstance } from '../services/templateService';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | undefined>();
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [showInstancesDialog, setShowInstancesDialog] = useState(false);
  const [templateInstances, setTemplateInstances] = useState<TemplateInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await TemplateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(undefined);
    setEditorMode('create');
    setShowEditor(true);
  };

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditorMode('edit');
    setShowEditor(true);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await TemplateService.duplicateTemplate(template.id);
      toast.success('Plantilla duplicada exitosamente');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Error al duplicar la plantilla');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    try {
      await TemplateService.deleteTemplate(template.id);
      toast.success('Plantilla eliminada exitosamente');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
    }
  };

  const handleSaveTemplate = (template: Template) => {
    setShowEditor(false);
    loadTemplates();
  };

  const handleViewInstances = async (template: Template) => {
    try {
      setInstancesLoading(true);
      setShowInstancesDialog(true);
      const instances = await TemplateService.getTemplateInstances(template.id);
      setTemplateInstances(instances);
    } catch (error) {
      console.error('Error loading template instances:', error);
      toast.error('Error al cargar las instancias');
    } finally {
      setInstancesLoading(false);
    }
  };

  const handleGenerateDocument = async (template: Template) => {
    try {
      // Datos de ejemplo para la generación
      const sampleData = {
        fecha_actual: new Date().toLocaleDateString('es-PE'),
        usuario: 'Usuario Demo',
        empresa: 'Mi Empresa',
        items: [
          { nombre: 'Producto 1', cantidad: 10, precio: 25.50 },
          { nombre: 'Producto 2', cantidad: 5, precio: 15.00 }
        ]
      };

      const instance = await TemplateService.generateDocument({
        template_id: template.id,
        data_context: sampleData,
        output_format: 'html',
        expires_in_hours: 24
      });

      toast.success('Documento generado exitosamente');
      
      // Actualizar la lista de instancias si está abierta
      if (showInstancesDialog) {
        handleViewInstances(template);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar el documento');
    }
  };

  const getCategoryIcon = (category: Template['category']) => {
    switch (category) {
      case 'report': return <FileText className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'label': return <Tag className="w-4 h-4" />;
      case 'invoice': return <FileText className="w-4 h-4" />;
      case 'certificate': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: Template['category']) => {
    switch (category) {
      case 'report': return 'Reporte';
      case 'document': return 'Documento';
      case 'label': return 'Etiqueta';
      case 'invoice': return 'Factura';
      case 'certificate': return 'Certificado';
      default: return category;
    }
  };

  const getStatusColor = (status: TemplateInstance['generation_status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showEditor) {
    return (
      <TemplateEditor
        template={selectedTemplate}
        mode={editorMode}
        onSave={handleSaveTemplate}
        onCancel={() => setShowEditor(false)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plantillas de Documentos</h1>
          <p className="text-gray-600">Crea y gestiona plantillas personalizadas para tus documentos</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar plantillas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="report">Reportes</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="label">Etiquetas</SelectItem>
            <SelectItem value="invoice">Facturas</SelectItem>
            <SelectItem value="certificate">Certificados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay plantillas</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || categoryFilter !== 'all'
              ? 'No se encontraron plantillas con los filtros aplicados'
              : 'Aún no has creado ninguna plantilla'}
          </p>
          <Button onClick={handleCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Plantilla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(template.category)}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-600">{getCategoryLabel(template.category)}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewInstances(template)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Instancias
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateDocument(template)}>
                        <Download className="w-4 h-4 mr-2" />
                        Generar Documento
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>v{template.version}</span>
                  <div className="flex items-center space-x-2">
                    {template.is_public && (
                      <Badge variant="outline" className="text-xs">
                        Público
                      </Badge>
                    )}
                    <span>{new Date(template.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Instances Dialog */}
      <Dialog open={showInstancesDialog} onOpenChange={setShowInstancesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instancias de Documentos Generados</DialogTitle>
            <DialogDescription>
              Lista de documentos generados usando esta plantilla
            </DialogDescription>
          </DialogHeader>
          
          {instancesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : templateInstances.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se han generado documentos con esta plantilla</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templateInstances.map((instance) => (
                <Card key={instance.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left section - Status and Document Info */}
                      <div className="flex items-start space-x-4">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(instance.generation_status)}`}>
                          {instance.generation_status === 'completed' && 'Completado'}
                          {instance.generation_status === 'processing' && 'Procesando'}
                          {instance.generation_status === 'failed' && 'Fallido'}
                          {instance.generation_status === 'pending' && 'Pendiente'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{instance.output_format.toUpperCase()}</span>
                            {instance.file_size && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {(instance.file_size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Generado: {new Date(instance.generated_at).toLocaleString('es-PE')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {instance.download_count} {instance.download_count === 1 ? 'descarga' : 'descargas'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right section - Actions */}
                      <div className="flex items-center justify-end lg:justify-start">
                        {instance.file_url && instance.generation_status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                            onClick={() => {
                              window.open(instance.file_url, '_blank');
                              TemplateService.incrementDownloadCount(instance.id);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {instance.error_message && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <div className="text-sm text-red-700">
                            <strong>Error:</strong> {instance.error_message}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;