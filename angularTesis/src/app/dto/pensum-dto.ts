export class PensumDTO {
    constructor(
      public codigo: string,
      public nombre: string,
      public creditos: number,
      public semestre: number,
      public requisitosJson: string,
      public requisitos: string[] = [] 
    ) {
      try {
        this.requisitos = JSON.parse(requisitosJson);
      } catch {
        this.requisitos = [];
      }
    }
  }
  