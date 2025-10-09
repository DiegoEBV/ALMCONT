import React, { Suspense, lazy } from 'react';
import { Template } from '../../services/templateService';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    <div className="ml-4 text-lg text-gray-600">Cargando editor de plantillas...</div>
  </div>
);

// Lazy load the heavy TemplateEditor component
const TemplateEditor = lazy(() => import('./TemplateEditor'));

interface LazyTemplateEditorProps {
  template?: Template;
  onSave?: (template: Template) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const LazyTemplateEditor: React.FC<LazyTemplateEditorProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TemplateEditor {...props} />
    </Suspense>
  );
};

export default LazyTemplateEditor;