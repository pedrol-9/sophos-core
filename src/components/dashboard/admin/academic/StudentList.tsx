import { IconSearch } from '@/components/icons';
import { Student } from '@/hooks/useAdminDashboard';

interface StudentListProps {
  students: Student[];
  search: string;
  setSearch: (val: string) => void;
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student) => void;
}

export function StudentList({ students, search, setSearch, selectedStudent, setSelectedStudent }: StudentListProps) {
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full bg-card border border-border rounded-2xl backdrop-blur-sm overflow-hidden shadow-xs">
      <div className="p-5 border-b border-border flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">Calificaciones y Monitoreo de IA</h2>
        
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Buscar alumno o materia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No se encontraron estudiantes que coincidan con la búsqueda.
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-secondary/70 ${
                selectedStudent?.id === student.id ? 'bg-primary/10 border-l-4 border-primary' : ''
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-secondary border border-border flex items-center justify-center text-muted-foreground font-medium">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} />
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                    student.status === 'excellent' ? 'bg-emerald-500' :
                    student.status === 'good' ? 'bg-indigo-500' :
                    student.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.subject} • {student.institution}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Asistencia</p>
                  <p className="text-xs font-semibold text-foreground">{student.attendance}%</p>
                </div>
                
                <div className="text-center min-w-[50px]">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Nota</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    student.grade >= 4.5 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    student.grade >= 3.0 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                    student.grade >= 2.8 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {student.grade.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
