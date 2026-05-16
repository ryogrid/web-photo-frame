export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
  filename?: string;
  prefix?: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}
