import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportData {
  titulo: string;
  subtitulo?: string;
  fecha: Date;
  datos: any[];
  columnas: { header: string; dataKey: string; width?: number }[];
  resumen?: { [key: string]: any };
  graficos?: { titulo: string; datos: any[] }[];
  metadatos?: { [key: string]: any };
}

interface ExportOptions {
  formato: 'pdf' | 'excel' | 'csv';
  incluirGraficos?: boolean;
  incluirResumen?: boolean;
  orientacion?: 'portrait' | 'landscape';
  tamañoPagina?: 'a4' | 'letter' | 'a3';
  nombreArchivo?: string;
}

class ExportService {
  /**
   * Exporta datos a PDF
   */
  async exportToPDF(data: ExportData, options: ExportOptions = { formato: 'pdf' }): Promise<void> {
    try {
      const doc = new jsPDF({
        orientation: options.orientacion || 'portrait',
        unit: 'mm',
        format: options.tamañoPagina || 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header del documento
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(data.titulo, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      if (data.subtitulo) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(data.subtitulo, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Fecha de generación
      doc.setFontSize(10);
      doc.text(
        `Generado el: ${format(data.fecha, 'dd/MM/yyyy HH:mm', { locale: es })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 15;

      // Resumen si está disponible
      if (options.incluirResumen && data.resumen) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Ejecutivo', 14, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        Object.entries(data.resumen).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 14, yPosition);
          yPosition += 5;
        });
        
        yPosition += 10;
      }

      // Tabla principal
      if (data.datos && data.datos.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos Detallados', 14, yPosition);
        yPosition += 5;

        const tableColumns = data.columnas.map(col => ({
          header: col.header,
          dataKey: col.dataKey,
          width: col.width
        }));

        doc.autoTable({
          startY: yPosition,
          head: [tableColumns.map(col => col.header)],
          body: data.datos.map(row => 
            tableColumns.map(col => this.formatCellValue(row[col.dataKey]))
          ),
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 14, right: 14 },
          columnStyles: this.getColumnStyles(data.columnas)
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: 'right' }
        );
        doc.text(
          'Sistema de Gestión de Almacén',
          14,
          pageHeight - 10
        );
      }

      // Guardar archivo
      const fileName = options.nombreArchivo || `${data.titulo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error exportando a PDF:', error);
      throw new Error('Error al generar el archivo PDF');
    }
  }

  /**
   * Exporta datos a Excel
   */
  async exportToExcel(data: ExportData, options: ExportOptions = { formato: 'excel' }): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();

      // Hoja principal con datos
      const worksheetData = [
        [data.titulo],
        data.subtitulo ? [data.subtitulo] : [],
        [`Generado el: ${format(data.fecha, 'dd/MM/yyyy HH:mm', { locale: es })}`],
        [], // Línea vacía
        data.columnas.map(col => col.header), // Headers
        ...data.datos.map(row => 
          data.columnas.map(col => this.formatCellValue(row[col.dataKey]))
        )
      ].filter(row => row.length > 0);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Aplicar estilos al header
      const headerRow = data.subtitulo ? 5 : 4;
      data.columnas.forEach((_, index) => {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: index });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = {};
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'CCCCCC' } },
          alignment: { horizontal: 'center' }
        };
      });

      // Ajustar ancho de columnas
      const columnWidths = data.columnas.map(col => ({
        wch: col.width || 15
      }));
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      // Hoja de resumen si está disponible
      if (options.incluirResumen && data.resumen) {
        const resumenData = [
          ['Resumen Ejecutivo'],
          [],
          ...Object.entries(data.resumen).map(([key, value]) => [key, value])
        ];
        
        const resumenWorksheet = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(workbook, resumenWorksheet, 'Resumen');
      }

      // Hoja de metadatos
      if (data.metadatos) {
        const metadatosData = [
          ['Metadatos del Reporte'],
          [],
          ...Object.entries(data.metadatos).map(([key, value]) => [key, value])
        ];
        
        const metadatosWorksheet = XLSX.utils.aoa_to_sheet(metadatosData);
        XLSX.utils.book_append_sheet(workbook, metadatosWorksheet, 'Metadatos');
      }

      // Guardar archivo
      const fileName = options.nombreArchivo || `${data.titulo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  /**
   * Exporta datos a CSV
   */
  async exportToCSV(data: ExportData, options: ExportOptions = { formato: 'csv' }): Promise<void> {
    try {
      const headers = data.columnas.map(col => col.header);
      const rows = data.datos.map(row => 
        data.columnas.map(col => this.formatCellValue(row[col.dataKey]))
      );

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = options.nombreArchivo || `${data.titulo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exportando a CSV:', error);
      throw new Error('Error al generar el archivo CSV');
    }
  }

  /**
   * Exporta gráficos como imágenes
   */
  async exportChartAsImage(chartElement: HTMLElement, fileName: string): Promise<void> {
    try {
      const canvas = await this.htmlToCanvas(chartElement);
      const link = document.createElement('a');
      
      link.download = `${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.png`;
      link.href = canvas.toDataURL();
      link.click();

    } catch (error) {
      console.error('Error exportando gráfico:', error);
      throw new Error('Error al exportar el gráfico');
    }
  }

  /**
   * Exporta múltiples reportes en un ZIP
   */
  async exportMultipleReports(reports: { data: ExportData; options: ExportOptions }[]): Promise<void> {
    try {
      // Esta funcionalidad requeriría una librería adicional como JSZip
      // Por ahora, exportamos cada reporte individualmente
      for (const report of reports) {
        await this.exportData(report.data, report.options);
      }
    } catch (error) {
      console.error('Error exportando múltiples reportes:', error);
      throw new Error('Error al exportar múltiples reportes');
    }
  }

  /**
   * Método principal de exportación
   */
  async exportData(data: ExportData, options: ExportOptions): Promise<void> {
    switch (options.formato) {
      case 'pdf':
        await this.exportToPDF(data, options);
        break;
      case 'excel':
        await this.exportToExcel(data, options);
        break;
      case 'csv':
        await this.exportToCSV(data, options);
        break;
      default:
        throw new Error('Formato de exportación no soportado');
    }
  }

  /**
   * Formatea valores de celda para exportación
   */
  private formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString('es-ES');
    }
    
    if (value instanceof Date) {
      return format(value, 'dd/MM/yyyy', { locale: es });
    }
    
    return String(value);
  }

  /**
   * Obtiene estilos de columna para PDF
   */
  private getColumnStyles(columnas: { header: string; dataKey: string; width?: number }[]): any {
    const styles: any = {};
    
    columnas.forEach((col, index) => {
      if (col.dataKey.includes('fecha')) {
        styles[index] = { halign: 'center' };
      } else if (col.dataKey.includes('cantidad') || col.dataKey.includes('precio') || col.dataKey.includes('costo')) {
        styles[index] = { halign: 'right' };
      }
    });
    
    return styles;
  }

  /**
   * Convierte elemento HTML a canvas (requiere html2canvas)
   */
  private async htmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
    // Esta funcionalidad requeriría la librería html2canvas
    // Por ahora, retornamos un canvas vacío
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText('Gráfico exportado', 50, 50);
    }
    
    return canvas;
  }

  /**
   * Genera datos de ejemplo para testing
   */
  generateSampleData(): ExportData {
    return {
      titulo: 'Reporte de Inventario',
      subtitulo: 'Análisis mensual de stock y movimientos',
      fecha: new Date(),
      datos: [
        { material: 'Cemento', cantidad: 100, precio: 25.50, total: 2550 },
        { material: 'Arena', cantidad: 50, precio: 15.00, total: 750 },
        { material: 'Grava', cantidad: 75, precio: 20.00, total: 1500 }
      ],
      columnas: [
        { header: 'Material', dataKey: 'material', width: 20 },
        { header: 'Cantidad', dataKey: 'cantidad', width: 15 },
        { header: 'Precio Unit.', dataKey: 'precio', width: 15 },
        { header: 'Total', dataKey: 'total', width: 15 }
      ],
      resumen: {
        'Total Items': 3,
        'Cantidad Total': 225,
        'Valor Total': '$4,800.00'
      },
      metadatos: {
        'Usuario': 'Sistema',
        'Módulo': 'Inventario',
        'Versión': '1.0.0'
      }
    };
  }
}

export const exportService = new ExportService();
export type { ExportData, ExportOptions };