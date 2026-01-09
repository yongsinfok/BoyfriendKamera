/**
 * Internationalization (i18n) system
 * Multi-language support for BoyfriendKamera
 */

export type SupportedLanguage = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt';

export interface Language {
	code: SupportedLanguage;
	name: string;
	nativeName: string;
	flag: string;
	rtl?: boolean;
}

export interface TranslationNamespace {
	common: Record<string, string>;
	pose: Record<string, string>;
	camera: Record<string, string>;
	settings: Record<string, string>;
	errors: Record<string, string>;
	messages: Record<string, string>;
}

// Supported languages
export const SUPPORTED_LANGUAGES: Language[] = [
	{ code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
	{ code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
	{ code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
	{ code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
	{ code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
	{ code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
	{ code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
	{ code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' }
];

// Translation data
const TRANSLATIONS: Record<SupportedLanguage, TranslationNamespace> = {
	zh: {
		common: {
			appName: '男友相机',
			loading: '加载中...',
			saving: '保存中...',
			success: '成功',
			error: '错误',
			cancel: '取消',
			confirm: '确认',
			back: '返回',
			next: '下一步',
			done: '完成',
			retry: '重试',
			delete: '删除',
			edit: '编辑',
			share: '分享',
			copy: '复制',
			close: '关闭'
		},
		pose: {
			title: '姿势指导',
			analyzing: 'AI 正在分析姿势...',
			excellent: '完美！',
			good: '很好！',
			improve: '可以更好',
			suggestions: '改进建议',
			targetPosition: '目标位置',
			currentPosition: '当前位置',
			accuracy: '准确度',
			confidence: '置信度',
			adjustments: '调整建议',
			stepByStep: '分步指导'
		},
		camera: {
			takePhoto: '拍照',
			switchCamera: '切换摄像头',
			flashOn: '开启闪光灯',
			flashOff: '关闭闪光灯',
			timer: '定时器',
			burstMode: '连拍模式',
			grid: '网格',
			hdr: 'HDR',
			filters: '滤镜',
			adjustments: '调整'
		},
		settings: {
			title: '设置',
			aiModel: 'AI 模型',
			apiKey: 'API 密钥',
			language: '语言',
			theme: '主题',
			notifications: '通知',
			privacy: '隐私',
			about: '关于',
			version: '版本',
			clearCache: '清除缓存',
			resetSettings: '重置设置'
		},
		errors: {
			cameraNotFound: '未找到摄像头',
			cameraPermission: '需要摄像头权限',
			networkError: '网络连接错误',
			apiError: 'API 调用失败',
			parseError: '解析响应失败',
			unknownError: '未知错误'
		},
		messages: {
			photoSaved: '照片已保存',
			photoDeleted: '照片已删除',
			linkCopied: '链接已复制',
			settingsSaved: '设置已保存',
			pleaseWait: '请稍候...'
		}
	},
	en: {
		common: {
			appName: 'BoyfriendKamera',
			loading: 'Loading...',
			saving: 'Saving...',
			success: 'Success',
			error: 'Error',
			cancel: 'Cancel',
			confirm: 'Confirm',
			back: 'Back',
			next: 'Next',
			done: 'Done',
			retry: 'Retry',
			delete: 'Delete',
			edit: 'Edit',
			share: 'Share',
			copy: 'Copy',
			close: 'Close'
		},
		pose: {
			title: 'Pose Guidance',
			analyzing: 'AI is analyzing pose...',
			excellent: 'Perfect!',
			good: 'Great!',
			improve: 'Can improve',
			suggestions: 'Suggestions',
			targetPosition: 'Target Position',
			currentPosition: 'Current Position',
			accuracy: 'Accuracy',
			confidence: 'Confidence',
			adjustments: 'Adjustments',
			stepByStep: 'Step by Step'
		},
		camera: {
			takePhoto: 'Take Photo',
			switchCamera: 'Switch Camera',
			flashOn: 'Flash On',
			flashOff: 'Flash Off',
			timer: 'Timer',
			burstMode: 'Burst Mode',
			grid: 'Grid',
			hdr: 'HDR',
			filters: 'Filters',
			adjustments: 'Adjustments'
		},
		settings: {
			title: 'Settings',
			aiModel: 'AI Model',
			apiKey: 'API Key',
			language: 'Language',
			theme: 'Theme',
			notifications: 'Notifications',
			privacy: 'Privacy',
			about: 'About',
			version: 'Version',
			clearCache: 'Clear Cache',
			resetSettings: 'Reset Settings'
		},
		errors: {
			cameraNotFound: 'Camera not found',
			cameraPermission: 'Camera permission required',
			networkError: 'Network connection error',
			apiError: 'API call failed',
			parseError: 'Failed to parse response',
			unknownError: 'Unknown error'
		},
		messages: {
			photoSaved: 'Photo saved',
			photoDeleted: 'Photo deleted',
			linkCopied: 'Link copied',
			settingsSaved: 'Settings saved',
			pleaseWait: 'Please wait...'
		}
	},
	ja: {
		common: {
			appName: 'ボーイフレンドカメラ',
			loading: '読み込み中...',
			saving: '保存中...',
			success: '成功',
			error: 'エラー',
			cancel: 'キャンセル',
			confirm: '確認',
			back: '戻る',
			next: '次へ',
			done: '完了',
			retry: '再試行',
			delete: '削除',
			edit: '編集',
			share: '共有',
			copy: 'コピー',
			close: '閉じる'
		},
		pose: {
			title: 'ポーズガイダンス',
			analyzing: 'AIがポーズを分析中...',
			excellent: '完璧です！',
			good: '素晴らしい！',
			improve: '改善できます',
			suggestions: '提案',
			targetPosition: '目標位置',
			currentPosition: '現在位置',
			accuracy: '精度',
			confidence: '信頼度',
			adjustments: '調整',
			stepByStep: 'ステップバイステップ'
		},
		camera: {
			takePhoto: '写真を撮る',
			switchCamera: 'カメラを切り替え',
			flashOn: 'フラッシュオン',
			flashOff: 'フラッシュオフ',
			timer: 'タイマー',
			burstMode: '連写モード',
			grid: 'グリッド',
			hdr: 'HDR',
			filters: 'フィルター',
			adjustments: '調整'
		},
		settings: {
			title: '設定',
			aiModel: 'AIモデル',
			apiKey: 'APIキー',
			language: '言語',
			theme: 'テーマ',
			notifications: '通知',
			privacy: 'プライバシー',
			about: 'について',
			version: 'バージョン',
			clearCache: 'キャッシュをクリア',
			resetSettings: '設定をリセット'
		},
		errors: {
			cameraNotFound: 'カメラが見つかりません',
			cameraPermission: 'カメラの権限が必要です',
			networkError: 'ネットワーク接続エラー',
			apiError: 'API呼び出し失敗',
			parseError: 'レスポンスの解析に失敗',
			unknownError: '不明なエラー'
		},
		messages: {
			photoSaved: '写真を保存しました',
			photoDeleted: '写真を削除しました',
			linkCopied: 'リンクをコピーしました',
			settingsSaved: '設定を保存しました',
			pleaseWait: 'お待ちください...'
		}
	},
	ko: {
		common: {
			appName: '보이프렌드카메라',
			loading: '로딩 중...',
			saving: '저장 중...',
			success: '성공',
			error: '오류',
			cancel: '취소',
			confirm: '확인',
			back: '뒤로',
			next: '다음',
			done: '완료',
			retry: '재시도',
			delete: '삭제',
			edit: '편집',
			share: '공유',
			copy: '복사',
			close: '닫기'
		},
		pose: {
			title: '포즈 가이드',
			analyzing: 'AI가 포즈를 분석 중...',
			excellent: '완벽해요!',
			good: '좋아요!',
			improve: '개선 가능',
			suggestions: '제안',
			targetPosition: '목표 위치',
			currentPosition: '현재 위치',
			accuracy: '정확도',
			confidence: '신뢰도',
			adjustments: '조정',
			stepByStep: '단계별'
		},
		camera: {
			takePhoto: '사진 촬영',
			switchCamera: '카메라 전환',
			flashOn: '플래시 켜기',
			flashOff: '플래시 끄기',
			timer: '타이머',
			burstMode: '연사 모드',
			grid: '그리드',
			hdr: 'HDR',
			filters: '필터',
			adjustments: '조정'
		},
		settings: {
			title: '설정',
			aiModel: 'AI 모델',
			apiKey: 'API 키',
			language: '언어',
			theme: '테마',
			notifications: '알림',
			privacy: '개인정보',
			about: '정보',
			version: '버전',
			clearCache: '캐시 삭제',
			resetSettings: '설정 재설정'
		},
		errors: {
			cameraNotFound: '카메라를 찾을 수 없습니다',
			cameraPermission: '카메라 권한이 필요합니다',
			networkError: '네트워크 연결 오류',
			apiError: 'API 호출 실패',
			parseError: '응답 구문 분석 실패',
			unknownError: '알 수 없는 오류'
		},
		messages: {
			photoSaved: '사진이 저장되었습니다',
			photoDeleted: '사진이 삭제되었습니다',
			linkCopied: '링크가 복사되었습니다',
			settingsSaved: '설정이 저장되었습니다',
			pleaseWait: '잠시만 기다려주세요...'
		}
	},
	es: {
		common: {
			appName: 'BoyfriendKamera',
			loading: 'Cargando...',
			saving: 'Guardando...',
			success: 'Éxito',
			error: 'Error',
			cancel: 'Cancelar',
			confirm: 'Confirmar',
			back: 'Atrás',
			next: 'Siguiente',
			done: 'Hecho',
			retry: 'Reintentar',
			delete: 'Eliminar',
			edit: 'Editar',
			share: 'Compartir',
			copy: 'Copiar',
			close: 'Cerrar'
		},
		pose: {
			title: 'Guía de Poses',
			analyzing: 'AI está analizando la pose...',
			excellent: '¡Perfecto!',
			good: '¡Bien!',
			improve: 'Puede mejorar',
			suggestions: 'Sugerencias',
			targetPosition: 'Posición Objetivo',
			currentPosition: 'Posición Actual',
			accuracy: 'Precisión',
			confidence: 'Confianza',
			adjustments: 'Ajustes',
			stepByStep: 'Paso a Paso'
		},
		camera: {
			takePhoto: 'Tomar Foto',
			switchCamera: 'Cambiar Cámara',
			flashOn: 'Flash On',
			flashOff: 'Flash Off',
			timer: 'Temporizador',
			burstMode: 'Modo Ráfaga',
			grid: 'Cuadrícula',
			hdr: 'HDR',
			filters: 'Filtros',
			adjustments: 'Ajustes'
		},
		settings: {
			title: 'Configuración',
			aiModel: 'Modelo IA',
			apiKey: 'Clave API',
			language: 'Idioma',
			theme: 'Tema',
			notifications: 'Notificaciones',
			privacy: 'Privacidad',
			about: 'Acerca de',
			version: 'Versión',
			clearCache: 'Limpiar Caché',
			resetSettings: 'Restablecer'
		},
		errors: {
			cameraNotFound: 'Cámara no encontrada',
			cameraPermission: 'Permiso de cámara requerido',
			networkError: 'Error de conexión de red',
			apiError: 'Fallo en llamada API',
			parseError: 'Error al analizar respuesta',
			unknownError: 'Error desconocido'
		},
		messages: {
			photoSaved: 'Foto guardada',
			photoDeleted: 'Foto eliminada',
			linkCopied: 'Enlace copiado',
			settingsSaved: 'Configuración guardada',
			pleaseWait: 'Espere por favor...'
		}
	},
	fr: {
		common: {
			appName: 'BoyfriendKamera',
			loading: 'Chargement...',
			saving: 'Enregistrement...',
			success: 'Succès',
			error: 'Erreur',
			cancel: 'Annuler',
			confirm: 'Confirmer',
			back: 'Retour',
			next: 'Suivant',
			done: 'Terminé',
			retry: 'Réessayer',
			delete: 'Supprimer',
			edit: 'Modifier',
			share: 'Partager',
			copy: 'Copier',
			close: 'Fermer'
		},
		pose: {
			title: 'Guide de Pose',
			analyzing: 'AI analyse la pose...',
			excellent: 'Parfait!',
			good: 'Bien!',
			improve: 'Peut améliorer',
			suggestions: 'Suggestions',
			targetPosition: 'Position Cible',
			currentPosition: 'Position Actuelle',
			accuracy: 'Précision',
			confidence: 'Confiance',
			adjustments: 'Ajustements',
			stepByStep: 'Étape par Étape'
		},
		camera: {
			takePhoto: 'Prendre Photo',
			switchCamera: 'Changer Caméra',
			flashOn: 'Flash Activé',
			flashOff: 'Flash Désactivé',
			timer: 'Minuterie',
			burstMode: 'Mode Rafale',
			grid: 'Grille',
			hdr: 'HDR',
			filters: 'Filtres',
			adjustments: 'Ajustements'
		},
		settings: {
			title: 'Paramètres',
			aiModel: 'Modèle IA',
			apiKey: 'Clé API',
			language: 'Langue',
			theme: 'Thème',
			notifications: 'Notifications',
			privacy: 'Confidentialité',
			about: 'À propos',
			version: 'Version',
			clearCache: 'Vider Cache',
			resetSettings: 'Réinitialiser'
		},
		errors: {
			cameraNotFound: 'Caméra non trouvée',
			cameraPermission: 'Permission caméra requise',
			networkError: 'Erreur de connexion réseau',
			apiError: 'Échec appel API',
			parseError: 'Échec analyse réponse',
			unknownError: 'Erreur inconnue'
		},
		messages: {
			photoSaved: 'Photo enregistrée',
			photoDeleted: 'Photo supprimée',
			linkCopied: 'Lien copié',
			settingsSaved: 'Paramètres enregistrés',
			pleaseWait: 'Veuillez patienter...'
		}
	},
	de: {
		common: {
			appName: 'BoyfriendKamera',
			loading: 'Laden...',
			saving: 'Speichern...',
			success: 'Erfolg',
			error: 'Fehler',
			cancel: 'Abbrechen',
			confirm: 'Bestätigen',
			back: 'Zurück',
			next: 'Weiter',
			done: 'Fertig',
			retry: 'Wiederholen',
			delete: 'Löschen',
			edit: 'Bearbeiten',
			share: 'Teilen',
			copy: 'Kopieren',
			close: 'Schließen'
		},
		pose: {
			title: 'Pose-Anleitung',
			analyzing: 'KI analysiert Pose...',
			excellent: 'Perfekt!',
			good: 'Gut!',
			improve: 'Verbesserbar',
			suggestions: 'Vorschläge',
			targetPosition: 'Zielposition',
			currentPosition: 'Aktuelle Position',
			accuracy: 'Genauigkeit',
			confidence: 'Konfidenz',
			adjustments: 'Anpassungen',
			stepByStep: 'Schritt für Schritt'
		},
		camera: {
			takePhoto: 'Foto Aufnehmen',
			switchCamera: 'Kamera Wechseln',
			flashOn: 'Blitz An',
			flashOff: 'Blitz Aus',
			timer: 'Timer',
			burstMode: 'Serie',
			grid: 'Gitter',
			hdr: 'HDR',
			filters: 'Filter',
			adjustments: 'Anpassungen'
		},
		settings: {
			title: 'Einstellungen',
			aiModel: 'KI Modell',
			apiKey: 'API Schlüssel',
			language: 'Sprache',
			theme: 'Design',
			notifications: 'Benachrichtigungen',
			privacy: 'Datenschutz',
			about: 'Über',
			version: 'Version',
			clearCache: 'Cache Leeren',
			resetSettings: 'Zurücksetzen'
		},
		errors: {
			cameraNotFound: 'Kamera nicht gefunden',
			cameraPermission: 'Kameraberechtigung erforderlich',
			networkError: 'Netzwerkverbindungsfehler',
			apiError: 'API-Aufruf fehlgeschlagen',
			parseError: 'Antwortanalyse fehlgeschlagen',
			unknownError: 'Unbekannter Fehler'
		},
		messages: {
			photoSaved: 'Foto gespeichert',
			photoDeleted: 'Foto gelöscht',
			linkCopied: 'Link kopiert',
			settingsSaved: 'Einstellungen gespeichert',
			pleaseWait: 'Bitte warten...'
		}
	},
	pt: {
		common: {
			appName: 'BoyfriendKamera',
			loading: 'Carregando...',
			saving: 'Salvando...',
			success: 'Sucesso',
			error: 'Erro',
			cancel: 'Cancelar',
			confirm: 'Confirmar',
			back: 'Voltar',
			next: 'Próximo',
			done: 'Concluído',
			retry: 'Tentar Novamente',
			delete: 'Excluir',
			edit: 'Editar',
			share: 'Compartilhar',
			copy: 'Copiar',
			close: 'Fechar'
		},
		pose: {
			title: 'Guia de Pose',
			analyzing: 'AI está analisando a pose...',
			excellent: 'Perfeito!',
			good: 'Bom!',
			improve: 'Pode melhorar',
			suggestions: 'Sugestões',
			targetPosition: 'Posição Alvo',
			currentPosition: 'Posição Atual',
			accuracy: 'Precisão',
			confidence: 'Confiança',
			adjustments: 'Ajustes',
			stepByStep: 'Passo a Passo'
		},
		camera: {
			takePhoto: 'Tirar Foto',
			switchCamera: 'Trocar Câmera',
			flashOn: 'Flash Ligado',
			flashOff: 'Flash Desligado',
			timer: 'Temporizador',
			burstMode: 'Modo Burst',
			grid: 'Grade',
			hdr: 'HDR',
			filters: 'Filtros',
			adjustments: 'Ajustes'
		},
		settings: {
			title: 'Configurações',
			aiModel: 'Modelo IA',
			apiKey: 'Chave API',
			language: 'Idioma',
			theme: 'Tema',
			notifications: 'Notificações',
			privacy: 'Privacidade',
			about: 'Sobre',
			version: 'Versão',
			clearCache: 'Limpar Cache',
			resetSettings: 'Redefinir'
		},
		errors: {
			cameraNotFound: 'Câmera não encontrada',
			cameraPermission: 'Permissão de câmera necessária',
			networkError: 'Erro de conexão de rede',
			apiError: 'Falha na chamada API',
			parseError: 'Falha ao analisar resposta',
			unknownError: 'Erro desconhecido'
		},
		messages: {
			photoSaved: 'Foto salva',
			photoDeleted: 'Foto excluída',
			linkCopied: 'Link copiado',
			settingsSaved: 'Configurações salvas',
			pleaseWait: 'Por favor aguarde...'
		}
	}
};

// I18n manager
export class I18nManager {
	private currentLanguage: SupportedLanguage = 'zh';
	private fallbackLanguage: SupportedLanguage = 'en';
	private changeListeners: Set<(lang: SupportedLanguage) => void> = new Set();

	constructor() {
		this.loadSavedLanguage();
		this.detectBrowserLanguage();
	}

	// Load saved language from localStorage
	private loadSavedLanguage(): void {
		if (typeof window === 'undefined') return;

		try {
			const saved = localStorage.getItem('preferred_language');
			if (saved && this.isValidLanguage(saved)) {
				this.currentLanguage = saved as SupportedLanguage;
			}
		} catch (e) {
			console.error('Failed to load language:', e);
		}
	}

	// Detect browser language
	private detectBrowserLanguage(): void {
		if (typeof window === 'undefined') return;

		// Only detect if no saved preference
		const saved = localStorage.getItem('preferred_language');
		if (saved) return;

		try {
			const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
			if (this.isValidLanguage(browserLang)) {
				this.currentLanguage = browserLang;
			}
		} catch (e) {
			console.error('Failed to detect browser language:', e);
		}
	}

	// Validate language code
	private isValidLanguage(code: string): code is SupportedLanguage {
		return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
	}

	// Set current language
	setLanguage(language: SupportedLanguage): void {
		if (!this.isValidLanguage(language)) {
			console.error(`Invalid language: ${language}`);
			return;
		}

		this.currentLanguage = language;

		// Save to localStorage
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('preferred_language', language);
			} catch (e) {
				console.error('Failed to save language:', e);
			}
		}

		// Notify listeners
		this.changeListeners.forEach(listener => listener(language));
	}

	// Get current language
	getLanguage(): SupportedLanguage {
		return this.currentLanguage;
	}

	// Get language info
	getLanguageInfo(code?: SupportedLanguage): Language | undefined {
		const langCode = code || this.currentLanguage;
		return SUPPORTED_LANGUAGES.find(lang => lang.code === langCode);
	}

	// Translate a key
	t(key: string, namespace?: keyof TranslationNamespace): string {
		const ns = namespace || 'common';
		const translations = TRANSLATIONS[this.currentLanguage];

		if (translations[ns] && translations[ns][key]) {
			return translations[ns][key];
		}

		// Fallback to English
		const fallbackTranslations = TRANSLATIONS[this.fallbackLanguage];
		if (fallbackTranslations[ns] && fallbackTranslations[ns][key]) {
			return fallbackTranslations[ns][key];
		}

		// Return key if not found
		return key;
	}

	// Translate with parameters
	tp(key: string, params: Record<string, string | number>, namespace?: keyof TranslationNamespace): string {
		let text = this.t(key, namespace);

		// Replace parameters
		for (const [param, value] of Object.entries(params)) {
			text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
		}

		return text;
	}

	// Check if current language is RTL
	isRTL(): boolean {
		const langInfo = this.getLanguageInfo();
		return langInfo?.rtl || false;
	}

	// Subscribe to language changes
	onLanguageChange(callback: (lang: SupportedLanguage) => void): () => void {
		this.changeListeners.add(callback);

		// Return unsubscribe function
		return () => {
			this.changeListeners.delete(callback);
		};
	}

	// Get all supported languages
	getSupportedLanguages(): Language[] {
		return [...SUPPORTED_LANGUAGES];
	}

	// Format date according to locale
	formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
		return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
	}

	// Format number according to locale
	formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
		return new Intl.NumberFormat(this.currentLanguage, options).format(num);
	}

	// Format currency according to locale
	formatCurrency(amount: number, currency: string = 'CNY'): string {
		return new Intl.NumberFormat(this.currentLanguage, {
			style: 'currency',
			currency
		}).format(amount);
	}
}

// Global i18n manager instance
let globalI18n: I18nManager | null = null;

export function getI18nManager(): I18nManager {
	if (!globalI18n) {
		globalI18n = new I18nManager();
	}
	return globalI18n;
}

// Convenience function for translation
export function t(key: string, namespace?: keyof TranslationNamespace): string {
	return getI18nManager().t(key, namespace);
}

// Convenience function for translation with params
export function tp(key: string, params: Record<string, string | number>, namespace?: keyof TranslationNamespace): string {
	return getI18nManager().tp(key, params, namespace);
}
