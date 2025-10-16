import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LecturaService } from '../services/lectura.service';
import { HistorialService } from '../services/historial.service';
import { Progreso } from '../models/progreso.model';
import { NgIf, NgFor , DatePipe} from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor],
  templateUrl: './main.html',
  providers: [DatePipe],
  styleUrls: ['./main.css']
})
export class Main implements AfterViewInit, OnInit, OnDestroy {

  historial: Progreso = new Progreso();
  mostrarMenu = false;
  cargando: boolean = false;
  isDragOver: boolean = false;
  tieneInformeAnterior = false;
  ultimoInforme?: { nombreArchivo: string; fecha: Date; archivo?: File };
  currentIndex: number = 0;
  canScrollLeft: boolean = true;
  canScrollRight: boolean = false;

  private sections: string[] = ['inicio', 'historial-container', 'features', 'benefits'];
  private currentActiveSection: string = 'inicio';
  private isScrolling: boolean = false;

  constructor(
    private lecturaService: LecturaService,
    private historialService: HistorialService,
    private router: Router,
    private authService: AuthService,
    private datePipe: DatePipe
  ) { }

  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;

  features = [
    {
      title: 'Progreso Académico',
      description: 'Consulta el histórico de tu progreso académico de manera visual e intuitiva a través del informe de avance cargado.',
      image: 'assets/images/pathway.png'
    },
    {
      title: 'Simulación Académica',
      description: 'Genera proyecciones personalizadas de escenarios académicos según tus asignaturas aprobadas.',
      image: 'assets/images/stopwatch.png'
    },
    {
      title: 'Recomendación de Materias',
      description: 'Recibe sugerencias de asignaturas basadas en tus gustos e intereses con ayuda de un modelo de inteligencia artificial.',
      image: 'assets/images/recomendation.png'
    },
    {
      title: 'Búsqueda de Información Universitaria',
      description: 'Encuentra información relevante sobre programas académicos, requisitos de admisión, reglamento estudiantil y más.',
      image: 'assets/images/search-file.png'
    }
  ];

  toggleMenu() {
    this.mostrarMenu = !this.mostrarMenu;
  }

  scrollLeft() {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 320;
    container.scrollBy({
      left: -cardWidth,
      behavior: 'smooth'
    });

    setTimeout(() => {
      this.updateScrollButtons();
      this.updateCurrentIndex();
    }, 300);
  }

  scrollRight() {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 320;
    container.scrollBy({
      left: cardWidth,
      behavior: 'smooth'
    });

    setTimeout(() => {
      this.updateScrollButtons();
      this.updateCurrentIndex();
    }, 300);
  }

  ngOnInit(): void {
    this.initScrollSpy();
    this.obtenerUltimoInforme();
  }

  ngAfterViewInit(): void {
    this.updateScrollButtons();
  }

  ngOnDestroy(): void {
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!this.isScrolling) {
      this.updateActiveNavigation();
    }
  }

  scrollToIndex(index: number): void {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 320;
    container.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth'
    });

    this.currentIndex = index;
    setTimeout(() => {
      this.updateScrollButtons();
    }, 300);
  }

  private updateScrollButtons(): void {
    const container = this.scrollContainer.nativeElement;
    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth);
  }

  private updateCurrentIndex(): void {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 320;
    this.currentIndex = Math.round(container.scrollLeft / cardWidth);
  }

  trackByFeature(index: number, feature: any): string {
    return feature.title;
  }

  benefits = [
    {
      title: 'Optimiza tu tiempo',
      description: 'Planifica tu carga académica de manera eficiente y evita conflictos de horarios.'
    },
    {
      title: 'Mayor control sobre tu avance',
      description: 'Visualiza tu progreso académico en tiempo real y toma decisiones informadas.'
    },
    {
      title: 'Planea según tus objetivos académicos',
      description: 'Personaliza tu ruta académica según tus metas profesionales y preferencias.'
    },
    {
      title: 'Prevenirás retrasos',
      description: 'Identifica posibles obstáculos y toma medidas preventivas a tiempo.'
    },
    {
      title: 'Tomarás decisiones académicas con información confiable',
      description: 'Recibe recomendaciones basadas en datos y estadísticas académicas.'
    }
  ];


  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.historial.archivoSeleccionado = file;
      this.historial.error = '';
    } else {
      this.historial.error = 'Debe seleccionar un archivo PDF válido.';
    }
  }

  obtenerUltimoInforme(): void {
  this.lecturaService.getUltimoInformeAvance().subscribe({
    next: (data: any) => {
      if (data && data.archivo) {
        this.tieneInformeAnterior = true;

        const nombre = data.nombreArchivo || 'informe-avance.pdf';
        const fecha = new Date(data.fechaPublicacion || new Date());
        const archivoRaw = data.archivo;
        let file: File | undefined;

        try {
          // 1) Si el backend ya envía un File o Blob (browser-side)
          if (archivoRaw instanceof File) {
            file = archivoRaw as File;
          } else if (archivoRaw instanceof Blob) {
            file = new File([archivoRaw], nombre, { type: 'application/pdf' });
          }
          // 2) Si el backend envía un ArrayBuffer
          else if (archivoRaw instanceof ArrayBuffer) {
            file = new File([new Uint8Array(archivoRaw)], nombre, { type: 'application/pdf' });
          }
          // 3) Si el backend envía un arreglo de bytes (number[])
          else if (Array.isArray(archivoRaw) && archivoRaw.every((b: any) => typeof b === 'number')) {
            file = new File([new Uint8Array(archivoRaw)], nombre, { type: 'application/pdf' });
          }
          // 4) Si el backend envía una cadena base64
          else if (typeof archivoRaw === 'string') {
            // puede ser base64 puro o prefijado "data:application/pdf;base64,..."
            const base64 = archivoRaw.includes('base64,') ? archivoRaw.split('base64,')[1] : archivoRaw;
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            file = new File([byteArray], nombre, { type: 'application/pdf' });
          } else {
            console.warn('Tipo de "archivo" desconocido:', archivoRaw);
          }
        } catch (err) {
          console.error('Error al convertir archivo:', err);
        }

        this.ultimoInforme = {
          nombreArchivo: nombre,
          fecha,
          archivo: file
        };

        // Si no pudimos reconstruir file, ocultar sección (opcional)
        if (!file) {
          this.tieneInformeAnterior = false;
        }
      } else {
        this.tieneInformeAnterior = false;
      }
    },
    error: (error) => {
      console.warn('No hay informe previo o hubo un error:', error);
      this.tieneInformeAnterior = false;
    }
  });
  }

  cargarUltimoInforme(): void {
    if (!this.ultimoInforme?.archivo) return;

    this.historial.archivoSeleccionado = this.ultimoInforme.archivo;
    this.historial.error = '';
  }

  onSubmit(): void {
    if (!this.historial.archivoSeleccionado) {
      this.historial.error = 'Primero seleccione un archivo PDF.';
      return;
    }
    this.cargando = true;

    this.lecturaService.subirArchivo(this.historial.archivoSeleccionado).subscribe({
      next: (respuesta) => {
        this.historialService.setHistorial(respuesta);
        this.router.navigate(['/historial']);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        this.historial.error = 'El archivo no corresponde a un informe de avance.';
        this.cargando = false;
      }
    });
  }

  cerrarSesion() {
    console.log('🔴 Iniciando cierre de sesión...');

    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout exitoso, redirigiendo a login');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        // Aún así redirigimos porque el estado local se limpia
        this.router.navigate(['/login']);
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.historial.archivoSeleccionado = file;
        this.historial.error = '';
      } else {
        this.historial.error = 'Solo se permiten archivos PDF.';
      }
    }
  }

  removeFile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.historial.archivoSeleccionado = undefined;
    this.historial.error = '';
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();

    this.isScrolling = true;

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    (event.target as HTMLElement).classList.add('active');
    this.currentActiveSection = sectionId;

    const section = document.getElementById(sectionId);
    if (section) {
      const headerHeight = 80;
      const elementPosition = section.offsetTop;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      setTimeout(() => {
        this.isScrolling = false;
      }, 1000);
    }
  }

  private initScrollSpy(): void {
    this.updateActiveNavigation();
  }

  // Actualizar la navegación activa basada en la sección visible
  private updateActiveNavigation(): void {
    const headerHeight = 100;
    let currentSection = '';

    // Encontrar qué sección está actualmente visible
    for (const sectionId of this.sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.pageYOffset;
        const elementBottom = elementTop + element.offsetHeight;
        const scrollPosition = window.pageYOffset + headerHeight;

        // Si estamos dentro de esta sección
        if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
          currentSection = sectionId;
          break;
        }
      }
    }

    // Si no encontramos ninguna sección específica, usar la última visible
    if (!currentSection) {
      const windowHeight = window.innerHeight;
      const scrollPosition = window.pageYOffset + headerHeight;

      for (const sectionId of this.sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.pageYOffset;

          if (scrollPosition >= elementTop - windowHeight / 3) {
            currentSection = sectionId;
          }
        }
      }
    }

    // Actualizar la navegación si cambió la sección
    if (currentSection && currentSection !== this.currentActiveSection) {
      this.currentActiveSection = currentSection;
      this.updateNavigationHighlight(currentSection);
    }
  }

  // Actualizar el resaltado de la navegación
  private updateNavigationHighlight(activeSection: string): void {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const sectionToLinkMap: { [key: string]: string } = {
      'inicio': '#inicio',
      'historial-container': '#informe',
      'features': '#funcionalidades',
      'benefits': '#beneficios'
    };

    const targetHref = sectionToLinkMap[activeSection];
    if (targetHref) {
      const activeLink = document.querySelector(`a[href="${targetHref}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  }
}