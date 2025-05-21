export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}
