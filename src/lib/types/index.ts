// Supabase table types
export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					anonymous_id: string;
					api_key_encrypted: string | null;
					default_model: string;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
				Update: Omit<Database['public']['Tables']['users']['Row'], 'id'>;
			};
			preset_styles: {
				Row: {
					id: string;
					name: string;
					description: string | null;
					config: Record<string, unknown>;
					is_active: boolean;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['preset_styles']['Row'], 'id' | 'created_at'>;
				Update: Database['public']['Tables']['preset_styles']['Row'];
			};
			custom_styles: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					profile: StyleProfile;
					sample_count: number;
					created_at: string;
					updated_at: string;
				};
				Insert: Omit<Database['public']['Tables']['custom_styles']['Row'], 'id' | 'created_at' | 'updated_at'>;
				Update: Omit<Database['public']['Tables']['custom_styles']['Row'], 'id' | 'created_at' | 'updated_at'>;
			};
			sessions: {
				Row: {
					id: string;
					user_id: string;
					style_id: string | null;
					started_at: string;
					completed_at: string | null;
					photo_count: number;
					ai_selection: string[] | null;
					user_feedback: Record<string, unknown> | null;
					synced_at: string | null;
				};
				Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'started_at'>;
				Update: Database['public']['Tables']['sessions']['Row'];
			};
			photos: {
				Row: {
					id: string;
					session_id: string;
					storage_path: string | null;
					analysis: PhotoAnalysis | null;
					is_ai_selected: boolean;
					is_user_selected: boolean | null;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['photos']['Row'], 'id' | 'created_at'>;
				Update: Database['public']['Tables']['photos']['Row'];
			};
		};
	};
}

// App types
export interface StyleProfile {
	composition: string[];
	preferred_angles: string[];
	tone: string;
	lighting: string;
	background: string;
	mood: string;
	tags: string[];
}

export interface PhotoAnalysis {
	score: number;
	reasons: string[];
	tags: string[];
	composition?: string;
	lighting?: string;
	angle?: string;
}

export interface Photo {
	id: string;
	sessionId: string;
	blob: Blob;
	thumbnail?: string;
	analysis?: PhotoAnalysis;
	isAiSelected?: boolean;
	isUserSelected?: boolean;
	createdAt: Date;
}

export interface Session {
	id: string;
	styleId: string | null;
	startedAt: Date;
	completedAt: Date | null;
	photos: Photo[];
	aiSelection: string[] | null;
	userFeedback: Record<string, unknown> | null;
}

export interface AISuggestion {
	composition_suggestion: string;
	lighting_assessment: string;
	angle_suggestion: string;
	overall_score: number;
	should_vibrate: boolean;
	guide_lines?: GuideLine[];
}

export interface GuideLine {
	type: 'rule_of_thirds' | 'standing_position';
	position?: string;
	x?: number;
	y?: number;
}

export interface PresetStyle {
	id: string;
	name: string;
	description: string | null;
	config: Record<string, unknown>;
}

export type ModelType = 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.6v-flashx';

export interface AppSettings {
	apiKey: string;
	defaultModel: ModelType;
	defaultStyle: string | null;
	enableVibration: boolean;
	enableGuideLines: boolean;
	hasSeenOnboarding: boolean;
}
