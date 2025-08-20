import React, { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsPluginForms from 'grapesjs-plugin-forms';
import gjsPluginExport from 'grapesjs-plugin-export';
import gjsStyleBg from 'grapesjs-style-bg';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Save, Eye, Download, Settings, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Template, TemplateVariable, CreateTemplateRequest, TemplateService } from '../../services/templateService';

interface TemplateEditorProps {
  template?: Template;
  onSave?: (template: Template) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

interface VariableFormData {
  name: string;
  type: TemplateVariable['type'];
  description: string;
  required: boolean;
  default_value: string;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  mode = 'create'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [templateCategory, setTemplateCategory] = useState<Template['category']>(template?.category || 'report');
  const [templateTags, setTemplateTags] = useState<string[]>(template?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(template?.is_public || false);
  
  // Variables state
  const [variables, setVariables] = useState<TemplateVariable[]>(template?.variables || []);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [variableForm, setVariableForm] = useState<VariableFormData>({
    name: '',
    type: 'text',
    description: '',
    required: false,
    default_value: ''
  });

  useEffect(() => {
    if (!editorRef.current) return;

    const grapesEditor = grapesjs.init({
      container: editorRef.current,
      height: '600px',
      width: 'auto',
      storageManager: false,
      blockManager: {
        appendTo: '.blocks-container',
      },
      styleManager: {
        appendTo: '.styles-container',
      },
      layerManager: {
        appendTo: '.layers-container',
      },
      traitManager: {
        appendTo: '.traits-container',
      },
      selectorManager: {
        appendTo: '.selectors-container',
      },
      panels: {
        defaults: [
          {
            id: 'basic-actions',
            el: '.panel-basic-actions',
            buttons: [
              {
                id: 'visibility',
                active: true,
                className: 'btn-toggle-borders',
                label: '<i class="fa fa-clone"></i>',
                command: 'sw-visibility',
              },
              {
                id: 'export',
                className: 'btn-open-export',
                label: '<i class="fa fa-code"></i>',
                command: 'export-template',
                context: 'export-template',
              },
              {
                id: 'show-json',
                className: 'btn-show-json',
                label: '<i class="fa fa-file-code-o"></i>',
                context: 'show-json',
                command: 'show-json',
              }
            ],
          },
          {
            id: 'panel-devices',
            el: '.panel-devices',
            buttons: [
              {
                id: 'device-desktop',
                label: '<i class="fa fa-desktop"></i>',
                command: 'set-device-desktop',
                active: true,
                togglable: false,
              },
              {
                id: 'device-tablet',
                label: '<i class="fa fa-tablet"></i>',
                command: 'set-device-tablet',
                togglable: false,
              },
              {
                id: 'device-mobile',
                label: '<i class="fa fa-mobile"></i>',
                command: 'set-device-mobile',
                togglable: false,
              },
            ],
          },
        ],
      },
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
          },
          {
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px',
          },
          {
            name: 'Mobile',
            width: '320px',
            widthMedia: '768px',
          },
        ],
      },
      plugins: [
        gjsPresetWebpage,
        gjsBlocksBasic,
        gjsPluginForms,
        gjsPluginExport,
        gjsStyleBg,
      ],
      pluginsOpts: {
        'gjs-preset-webpage': {
          modalImportTitle: 'Importar Template',
          modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Pega aquí tu HTML/CSS y haz clic en Importar</div>',
          modalImportContent: function(editor: any) {
            return editor.getHtml() + '<style>' + editor.getCss() + '</style>';
          },
        },
        'gjs-blocks-basic': {},
        'grapesjs-plugin-forms': {},
        'grapesjs-plugin-export': {},
        'grapesjs-style-bg': {},
      },
    });

    // Agregar componentes personalizados
    addCustomComponents(grapesEditor);
    
    // Agregar comandos personalizados
    grapesEditor.Commands.add('show-json', {
      run: (editor: any) => {
        editor.Modal.setTitle('Components JSON')
          .setContent(`<textarea style="width:100%; height: 250px;">
            ${JSON.stringify(editor.getComponents(), null, 2)}
          </textarea>`)
          .open();
      }
    });
    
    // Cargar template existente si está en modo edición
    if (template && template.template_data) {
      grapesEditor.setComponents(template.template_data.html || '');
      grapesEditor.setStyle(template.template_data.css || '');
    }

    setEditor(grapesEditor);

    return () => {
      grapesEditor.destroy();
    };
  }, [template]);

  const addCustomComponents = (editor: Editor) => {
    // Componente de texto dinámico
    editor.DomComponents.addType('dynamic-text', {
      model: {
        defaults: {
          tagName: 'span',
          draggable: true,
          droppable: false,
          attributes: { class: 'dynamic-text' },
          content: '{{variable_name}}',
          traits: [
            {
              type: 'text',
              name: 'variable',
              label: 'Variable',
              placeholder: 'Nombre de la variable'
            },
            {
              type: 'text',
              name: 'format',
              label: 'Formato',
              placeholder: 'ej: uppercase, currency'
            }
          ]
        },
        init() {
          this.on('change:attributes:variable', this.updateContent);
        },
        updateContent() {
          const variable = this.getAttributes().variable || 'variable_name';
          this.set('content', `{{${variable}}}`);
        }
      },
      view: {
        onRender() {
          this.el.style.border = '1px dashed #007bff';
          this.el.style.padding = '4px';
          this.el.style.backgroundColor = '#f8f9fa';
        }
      }
    });

    // Componente de tabla dinámica
    editor.DomComponents.addType('dynamic-table', {
      model: {
        defaults: {
          tagName: 'div',
          draggable: true,
          droppable: false,
          attributes: { class: 'dynamic-table' },
          content: '<table class="table"><thead><tr><th>Columna 1</th><th>Columna 2</th></tr></thead><tbody><tr><td>{{data.field1}}</td><td>{{data.field2}}</td></tr></tbody></table>',
          traits: [
            {
              type: 'text',
              name: 'dataSource',
              label: 'Fuente de Datos',
              placeholder: 'Nombre del array de datos'
            },
            {
              type: 'textarea',
              name: 'columns',
              label: 'Columnas (JSON)',
              placeholder: '[{"field": "name", "title": "Nombre"}]'
            }
          ]
        }
      },
      view: {
        onRender() {
          this.el.style.border = '2px dashed #28a745';
          this.el.style.padding = '8px';
          this.el.style.backgroundColor = '#f8fff9';
        }
      }
    });

    // Componente de código QR
    editor.DomComponents.addType('qr-code', {
      model: {
        defaults: {
          tagName: 'div',
          draggable: true,
          droppable: false,
          attributes: { class: 'qr-code' },
          content: '<div style="width: 100px; height: 100px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center;">QR Code</div>',
          traits: [
            {
              type: 'text',
              name: 'qrData',
              label: 'Datos del QR',
              placeholder: 'Texto o variable para el QR'
            },
            {
              type: 'number',
              name: 'size',
              label: 'Tamaño',
              placeholder: '100'
            }
          ]
        }
      }
    });

    // Agregar bloques personalizados
    editor.BlockManager.add('dynamic-text', {
      label: 'Texto Dinámico',
      category: 'Dinámico',
      content: { type: 'dynamic-text' },
      media: '<i class="fa fa-font"></i>'
    });

    editor.BlockManager.add('dynamic-table', {
      label: 'Tabla Dinámica',
      category: 'Dinámico',
      content: { type: 'dynamic-table' },
      media: '<i class="fa fa-table"></i>'
    });

    editor.BlockManager.add('qr-code', {
      label: 'Código QR',
      category: 'Dinámico',
      content: { type: 'qr-code' },
      media: '<i class="fa fa-qrcode"></i>'
    });
  };

  const handleSave = async () => {
    if (!editor || !templateName.trim()) {
      toast.error('Por favor completa el nombre del template');
      return;
    }

    setIsLoading(true);
    try {
      const templateData = {
        html: editor.getHtml(),
        css: editor.getCss(),
        components: editor.getComponents(),
        styles: editor.getStyle()
      };

      const requestData: CreateTemplateRequest = {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        template_data: templateData,
        variables: variables,
        tags: templateTags,
        is_public: isPublic
      };

      let savedTemplate: Template;
      if (mode === 'edit' && template) {
        savedTemplate = await TemplateService.updateTemplate({
          id: template.id,
          ...requestData
        });
      } else {
        savedTemplate = await TemplateService.createTemplate(requestData);
      }

      toast.success(`Template ${mode === 'edit' ? 'actualizado' : 'creado'} exitosamente`);
      onSave?.(savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar el template');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (!editor) return;
    
    const html = editor.getHtml();
    const css = editor.getCss();
    const previewContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>${html}</body>
      </html>
    `;
    
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(previewContent);
      previewWindow.document.close();
    }
  };

  const addTag = () => {
    if (newTag.trim() && !templateTags.includes(newTag.trim())) {
      setTemplateTags([...templateTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTemplateTags(templateTags.filter(tag => tag !== tagToRemove));
  };

  const addVariable = () => {
    if (!variableForm.name.trim()) {
      toast.error('El nombre de la variable es requerido');
      return;
    }

    const newVariable: TemplateVariable = {
      name: variableForm.name,
      type: variableForm.type,
      description: variableForm.description,
      required: variableForm.required,
      default_value: variableForm.default_value || undefined
    };

    setVariables([...variables, newVariable]);
    setVariableForm({
      name: '',
      type: 'text',
      description: '',
      required: false,
      default_value: ''
    });
    setShowVariableForm(false);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">
              {mode === 'edit' ? 'Editar Template' : 'Crear Template'}
            </h1>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Nombre del template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-64"
              />
              <Select value={templateCategory} onValueChange={(value: Template['category']) => setTemplateCategory(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Reporte</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="label">Etiqueta</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                  <SelectItem value="certificate">Certificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              Vista Previa
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <Tabs defaultValue="blocks" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="blocks">Bloques</TabsTrigger>
              <TabsTrigger value="settings">Config</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>
            
            <TabsContent value="blocks" className="p-4 space-y-4">
              <div className="blocks-container"></div>
            </TabsContent>
            
            <TabsContent value="settings" className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Descripción del template"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Etiquetas</Label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        placeholder="Nueva etiqueta"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button size="sm" onClick={addTag}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {templateTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                          <X
                            className="w-3 h-3 ml-1 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <Label htmlFor="isPublic">Template público</Label>
                  </div>
                </CardContent>
              </Card>
              
              <div className="styles-container"></div>
              <div className="traits-container"></div>
            </TabsContent>
            
            <TabsContent value="variables" className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Variables del Template</h3>
                <Button size="sm" onClick={() => setShowVariableForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              
              {showVariableForm && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Nombre de la variable"
                      value={variableForm.name}
                      onChange={(e) => setVariableForm({...variableForm, name: e.target.value})}
                    />
                    <Select
                      value={variableForm.type}
                      onValueChange={(value: TemplateVariable['type']) => setVariableForm({...variableForm, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="date">Fecha</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                        <SelectItem value="object">Objeto</SelectItem>
                        <SelectItem value="calculated">Calculado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Descripción"
                      value={variableForm.description}
                      onChange={(e) => setVariableForm({...variableForm, description: e.target.value})}
                    />
                    <Input
                      placeholder="Valor por defecto"
                      value={variableForm.default_value}
                      onChange={(e) => setVariableForm({...variableForm, default_value: e.target.value})}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={variableForm.required}
                        onChange={(e) => setVariableForm({...variableForm, required: e.target.checked})}
                      />
                      <Label htmlFor="required">Requerido</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={addVariable}>Agregar</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowVariableForm(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-2">
                {variables.map((variable, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{variable.name}</div>
                          <div className="text-xs text-gray-500">{variable.type}</div>
                          {variable.description && (
                            <div className="text-xs text-gray-600 mt-1">{variable.description}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeVariable(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          <div className="border-b p-2 bg-white">
            <div className="panel-basic-actions flex space-x-2"></div>
            <div className="panel-devices flex space-x-2 mt-2"></div>
          </div>
          <div className="flex-1">
            <div ref={editorRef} className="h-full"></div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 border-l bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium mb-4">Capas</h3>
            <div className="layers-container"></div>
            
            <h3 className="font-medium mb-4 mt-6">Selectores</h3>
            <div className="selectors-container"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;