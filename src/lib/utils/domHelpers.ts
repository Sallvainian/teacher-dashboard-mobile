// src/lib/utils/domHelpers.ts
// Type-safe DOM element helpers

/**
 * Type guard to safely check if an event target is an HTML input element
 */
export function isHTMLInputElement(target: EventTarget | null): target is HTMLInputElement {
	return target instanceof HTMLInputElement;
}

/**
 * Type guard to safely check if an event target is an HTML textarea element
 */
export function isHTMLTextAreaElement(target: EventTarget | null): target is HTMLTextAreaElement {
	return target instanceof HTMLTextAreaElement;
}

/**
 * Type guard to safely check if an event target is an HTML select element
 */
export function isHTMLSelectElement(target: EventTarget | null): target is HTMLSelectElement {
	return target instanceof HTMLSelectElement;
}

/**
 * Type guard to safely check if an event target is an HTML form element
 */
export function isHTMLFormElement(target: EventTarget | null): target is HTMLFormElement {
	return target instanceof HTMLFormElement;
}

/**
 * Type guard to safely check if an event target is an HTML button element
 */
export function isHTMLButtonElement(target: EventTarget | null): target is HTMLButtonElement {
	return target instanceof HTMLButtonElement;
}

/**
 * Type guard to safely check if an event target is an HTML element
 */
export function isHTMLElement(target: EventTarget | null): target is HTMLElement {
	return target instanceof HTMLElement;
}

/**
 * Safely get the value from an event target if it's an input-like element
 */
export function getEventTargetValue(event: Event): string | null {
	const target = event.target;
	
	if (isHTMLInputElement(target) || isHTMLTextAreaElement(target) || isHTMLSelectElement(target)) {
		return target.value;
	}
	
	return null;
}

/**
 * Safely get the checked state from an event target if it's a checkbox/radio input
 */
export function getEventTargetChecked(event: Event): boolean | null {
	const target = event.target;
	
	if (isHTMLInputElement(target) && (target.type === 'checkbox' || target.type === 'radio')) {
		return target.checked;
	}
	
	return null;
}

/**
 * Safely get files from an event target if it's a file input
 */
export function getEventTargetFiles(event: Event): FileList | null {
	const target = event.target;
	
	if (isHTMLInputElement(target) && target.type === 'file') {
		return target.files;
	}
	
	return null;
}