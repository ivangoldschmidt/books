export type ShelfStatus = 'read' | 'reading' | 'want';
export type Book = {
  id:string; source:'google'|'openlibrary'|'gutendex'|'internetarchive'; sourceId:string; googleVolumeId?:string;
  title:string; authors:string[]; description:string; coverUrl?:string; publishedYear?:string; language?:string; isbn?:string;
  previewUrl?:string; embeddable?:boolean; genres?:string[]; authorCountries?:string[]; publisher?:string; series?:string;
};
export type LibraryItem = {id:string;user_id:string;book_key:string;status:ShelfStatus;read_count:number;rating:number|null;is_favorite:boolean;book:Book;created_at:string;updated_at:string;finished_at:string|null};
export type CustomCategory={id:string;user_id:string;name:string;created_at:string};
