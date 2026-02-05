export type RoomStatus = 'occupied' | 'awaiting_cleaning' | 'ready';

export interface Room {
  id: string;
  room_number: string;
  status: RoomStatus;
  last_status_change: string | null;
  last_changed_by: string | null;
  incubator_number: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  receives_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface RoomAccess {
  id: string;
  user_id: string;
  room_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
