
export interface User {
  username: string;
  email: string;
  isAdmin?: boolean;
  joinedAt: string;
}

export type InputDevice = 'Keyboard' | 'Gamepad' | 'Wheel';

export interface LapTime {
  id: string;
  username: string;
  userEmail?: string; // Added for DB relation
  trackId: string;
  carId: string;
  minutes: number;
  seconds: number;
  milliseconds: number;
  totalMilliseconds: number;
  timestamp: string;
  conditions: 'Dry' | 'Wet';
  trackTemp?: number;
  inputDevice?: InputDevice;
  isVerified?: boolean;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  length: string; // e.g., "5.793 km"
  imageUrl?: string;
}

export interface Car {
  id: string;
  name: string;
  class: 'GT3' | 'GT4' | 'GT2' | 'TCX' | 'CUP' | 'GTC';
  brand: string;
}

export enum ViewState {
  LEADERBOARD = 'LEADERBOARD',
  SUBMIT = 'SUBMIT',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  ADMIN = 'ADMIN',
}