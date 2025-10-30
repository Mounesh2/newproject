import { FieldValue } from "firebase/firestore";

export type Point = { x: number; y: number };

export type DrawLine = {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
  width: number;
};

export type DrawEvent = {
  id?: string;
  userId: string;
  eventType: 'pen' | 'eraser';
  eventData: string; // JSON string of DrawLine data (excluding ctx)
  timestamp: FieldValue | Date;
}

export type ChatMessage = {
  id?: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: FieldValue | Date;
};

export type Participant = {
  userId: string;
  name: string;
};
