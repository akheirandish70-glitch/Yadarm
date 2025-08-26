
export type Status = 'action' | 'plan' | 'done';
export type Note = {
  id: string;
  user_id: string;
  text: string;
  status: Status;
  tag_ids: string[] | null;
  created_at: string;
};
export type Tag = { id: string; user_id: string; name: string; color: string; created_at: string };
