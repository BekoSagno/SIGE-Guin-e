import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Exporter un rapport en PDF
 */
export function exportReportToPDF(report) {
  const doc = new jsPDF();
  
  // En-tête
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 204);
  doc.text('RAPPORT DE TÂCHES EDG', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Numéro: ${report.reportNumber}`, 14, 30);
  doc.text(`Type: ${report.reportType}`, 14, 36);
  doc.text(`Période: ${new Date(report.periodStart).toLocaleDateString('fr-FR')} - ${new Date(report.periodEnd).toLocaleDateString('fr-FR')}`, 14, 42);
  doc.text(`Généré le: ${new Date(report.generatedAt).toLocaleString('fr-FR')}`, 14, 48);
  doc.text(`Généré par: ${report.generatedBy.nom}`, 14, 54);
  
  let yPos = 65;
  
  // Statistiques principales
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 204);
  doc.text('Statistiques Principales', 14, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const statsData = [
    ['Total Tâches', report.stats.total],
    ['Complétées', report.stats.completed],
    ['En cours', report.stats.inProgress],
    ['En attente', report.stats.pending],
    ['Temps moyen', report.stats.avgCompletionTime ? `${Math.round(report.stats.avgCompletionTime)} min` : 'N/A'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Indicateur', 'Valeur']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 204], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });
  
  yPos = doc.lastAutoTable.finalY + 15;
  
  // Répartition par type
  if (report.stats.incidents || report.stats.audits || report.stats.maintenance || report.stats.inspections) {
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text('Répartition par Type de Tâche', 14, yPos);
    yPos += 10;
    
    const typeData = [
      ['Incidents', report.stats.incidents || 0],
      ['Audits', report.stats.audits || 0],
      ['Maintenance', report.stats.maintenance || 0],
      ['Inspections', report.stats.inspections || 0],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Nombre']],
      body: typeData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
  }
  
  // Liste des tâches (premières 50)
  if (report.data?.tasks && report.data.tasks.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text(`Liste des Tâches (${Math.min(report.data.tasks.length, 50)} sur ${report.data.tasks.length})`, 14, yPos);
    yPos += 10;
    
    const tasksData = report.data.tasks.slice(0, 50).map(task => [
      task.taskNumber || '',
      task.type || '',
      task.priority || '',
      task.status || '',
      task.assignedTo?.nom || 'Non assigné',
      task.actualDuration ? `${task.actualDuration} min` : 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['N° Tâche', 'Type', 'Priorité', 'Statut', 'Agent', 'Durée']],
      body: tasksData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
        5: { cellWidth: 25 },
      },
    });
    
    if (report.data.tasks.length > 50) {
      yPos = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Note: Seules les 50 premières tâches sont affichées. Total: ${report.data.tasks.length} tâches.`, 14, yPos);
    }
  }
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} sur ${pageCount} - SIGE-Guinée - Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Télécharger
  doc.save(`Rapport_${report.reportNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Exporter un rapport en Excel
 */
export function exportReportToExcel(report) {
  const workbook = XLSX.utils.book_new();
  
  // Feuille 1: Résumé
  const summaryData = [
    ['RAPPORT DE TÂCHES EDG'],
    [],
    ['Numéro', report.reportNumber],
    ['Type', report.reportType],
    ['Période début', new Date(report.periodStart).toLocaleDateString('fr-FR')],
    ['Période fin', new Date(report.periodEnd).toLocaleDateString('fr-FR')],
    ['Généré le', new Date(report.generatedAt).toLocaleString('fr-FR')],
    ['Généré par', report.generatedBy.nom],
    [],
    ['STATISTIQUES PRINCIPALES'],
    [],
    ['Total Tâches', report.stats.total],
    ['Complétées', report.stats.completed],
    ['En cours', report.stats.inProgress],
    ['En attente', report.stats.pending],
    ['Temps moyen (min)', report.stats.avgCompletionTime ? Math.round(report.stats.avgCompletionTime) : 'N/A'],
    [],
    ['RÉPARTITION PAR TYPE'],
    [],
    ['Incidents', report.stats.incidents || 0],
    ['Audits', report.stats.audits || 0],
    ['Maintenance', report.stats.maintenance || 0],
    ['Inspections', report.stats.inspections || 0],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Largeur des colonnes
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
  
  // Feuille 2: Liste des tâches
  if (report.data?.tasks && report.data.tasks.length > 0) {
    const tasksData = [
      ['N° Tâche', 'Type', 'Priorité', 'Statut', 'Description', 'Agent', 'Zone', 'Assignée le', 'Complétée le', 'Durée estimée (min)', 'Durée réelle (min)', 'Rapport de complétion'],
      ...report.data.tasks.map(task => [
        task.taskNumber || '',
        task.type || '',
        task.priority || '',
        task.status || '',
        task.description || '',
        task.assignedTo?.nom || 'Non assigné',
        task.assignedTo?.zone || '',
        task.assignedAt ? new Date(task.assignedAt).toLocaleString('fr-FR') : '',
        task.completedAt ? new Date(task.completedAt).toLocaleString('fr-FR') : '',
        task.estimatedDuration || '',
        task.actualDuration || '',
        task.completionReport || '',
      ]),
    ];
    
    const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);
    
    // Style de l'en-tête
    const headerRange = XLSX.utils.decode_range(tasksSheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!tasksSheet[cellAddress]) continue;
      tasksSheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0066CC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    
    // Largeur des colonnes
    tasksSheet['!cols'] = [
      { wch: 20 }, // N° Tâche
      { wch: 12 }, // Type
      { wch: 10 }, // Priorité
      { wch: 12 }, // Statut
      { wch: 40 }, // Description
      { wch: 20 }, // Agent
      { wch: 15 }, // Zone
      { wch: 20 }, // Assignée le
      { wch: 20 }, // Complétée le
      { wch: 15 }, // Durée estimée
      { wch: 15 }, // Durée réelle
      { wch: 50 }, // Rapport
    ];
    
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tâches');
  }
  
  // Feuille 3: Statistiques par agent (si disponible)
  if (report.data?.stats?.byAgent && report.data.stats.byAgent.length > 0) {
    const agentData = [
      ['Agent', 'Total Tâches', 'Complétées', 'Taux de complétion (%)'],
      ...report.data.stats.byAgent.map(agent => [
        agent.agent,
        agent.total,
        agent.completed,
        agent.completionRate,
      ]),
    ];
    
    const agentSheet = XLSX.utils.aoa_to_sheet(agentData);
    
    // Style de l'en-tête
    const headerRange = XLSX.utils.decode_range(agentSheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!agentSheet[cellAddress]) continue;
      agentSheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0066CC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    
    agentSheet['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];
    
    XLSX.utils.book_append_sheet(workbook, agentSheet, 'Par Agent');
  }
  
  // Télécharger
  XLSX.writeFile(workbook, `Rapport_${report.reportNumber}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Exporter plusieurs rapports en Excel (comparaison)
 */
export function exportMultipleReportsToExcel(reports) {
  const workbook = XLSX.utils.book_new();
  
  // Feuille de comparaison
  const comparisonData = [
    ['Numéro', 'Type', 'Période', 'Total', 'Complétées', 'En cours', 'Temps moyen (min)', 'Généré le'],
    ...reports.map(report => [
      report.report_number,
      report.report_type,
      `${new Date(report.period_start).toLocaleDateString('fr-FR')} - ${new Date(report.period_end).toLocaleDateString('fr-FR')}`,
      report.total_tasks,
      report.completed_tasks,
      report.in_progress_tasks,
      report.avg_completion_time ? Math.round(report.avg_completion_time) : 'N/A',
      new Date(report.generated_at).toLocaleString('fr-FR'),
    ]),
  ];
  
  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  
  // Style de l'en-tête
  const headerRange = XLSX.utils.decode_range(comparisonSheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!comparisonSheet[cellAddress]) continue;
    comparisonSheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0066CC' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  
  comparisonSheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparaison');
  
  XLSX.writeFile(workbook, `Comparaison_Rapports_${new Date().toISOString().split('T')[0]}.xlsx`);
}
