export {
  StudentList,
  StudentDetail,
  PrintButton,
  CloseButton,
  Sidebar,
  StatsGrid,
  EvidenciasManager,
  EvidenciaFormModal,
  EvidenciaRow,
  AjustesAcademicos,
  BulkImportModal,
  CierrePeriodoManager,
  SubscriptionManager,
  OnboardingWizard,
} from './admin';

export {
  AcudienteHeader,
  AcudienteSidebar,
  AcudienteStatsHeader,
  AcudienteGradesTab,
  AcudienteAbsencesTab,
  AcudienteObservadorTab,
} from './acudiente';

export type {
  SubjectGrade,
  StudentSubject,
  AbsenceRecord,
  ObservadorRecord,
  KidProfile,
} from './acudiente';

export {
  DocenteHeader,
  DocenteSidebar,
  TeacherGradebook,
  GradebookTable,
  GradebookToolbar,
  GradebookSkeleton,
  TeacherGradeModal,
  EvidenciasPeriodoModal,
  UploadGradebookModal,
  TeacherObservadorModal,
  TeacherAttendanceTab,
  TeacherObservadorTab,
} from './teacher';
