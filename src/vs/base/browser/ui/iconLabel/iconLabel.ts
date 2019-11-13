/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./iconlabel';
import * as dom from 'vs/base/browser/dom';
import { HighlightedLabel } from 'vs/base/browser/ui/highlightedlabel/highlightedLabel';
import { IMatch } from 'vs/base/common/filters';
import { Disposable } from 'vs/base/common/lifecycle';

export interface IIconLabelCreationOptions {
	supportHighlights?: boolean;
	supportDescriptionHighlights?: boolean;
	supportCodicons?: boolean;
}

export interface IIconLabelValueOptions {
	title?: string;
	descriptionTitle?: string;
	hideIcon?: boolean;
	extraClasses?: string[];
	italic?: boolean;
	matches?: IMatch[];
	labelEscapeNewLines?: boolean;
	descriptionMatches?: IMatch[];
	readonly separator?: string;
}

class FastLabelNode {
	private disposed: boolean | undefined;
	private _textContent: string | undefined;
	private _className: string | undefined;
	private _title: string | undefined;
	private _empty: boolean | undefined;

	constructor(private _element: HTMLElement) {
	}

	get element(): HTMLElement {
		return this._element;
	}

	set textContent(content: string) {
		if (this.disposed || content === this._textContent) {
			return;
		}

		this._textContent = content;
		this._element.textContent = content;
	}

	set className(className: string) {
		if (this.disposed || className === this._className) {
			return;
		}

		this._className = className;
		this._element.className = className;
	}

	set title(title: string) {
		if (this.disposed || title === this._title) {
			return;
		}

		this._title = title;
		if (this._title) {
			this._element.title = title;
		} else {
			this._element.removeAttribute('title');
		}
	}

	set empty(empty: boolean) {
		if (this.disposed || empty === this._empty) {
			return;
		}

		this._empty = empty;
		this._element.style.marginLeft = empty ? '0' : '';
	}

	dispose(): void {
		this.disposed = true;
	}
}

export class IconLabel extends Disposable {

	private domNode: FastLabelNode;
	private descriptionContainer: FastLabelNode;
	private nameNode: Label | LabelWithHighlights;
	private descriptionNode: FastLabelNode | HighlightedLabel | undefined;
	private descriptionNodeFactory: () => FastLabelNode | HighlightedLabel;

	constructor(container: HTMLElement, options?: IIconLabelCreationOptions) {
		super();

		this.domNode = this._register(new FastLabelNode(dom.append(container, dom.$('.monaco-icon-label'))));

		const labelContainer = dom.append(this.domNode.element, dom.$('.monaco-icon-label-container'));

		const nameContainer = dom.append(labelContainer, dom.$('span.monaco-icon-name-container'));
		this.descriptionContainer = this._register(new FastLabelNode(dom.append(labelContainer, dom.$('span.monaco-icon-description-container'))));

		if (options?.supportHighlights) {
			this.nameNode = new LabelWithHighlights(nameContainer, !!options.supportCodicons);
		} else {
			this.nameNode = new Label(nameContainer);
		}

		if (options?.supportDescriptionHighlights) {
			this.descriptionNodeFactory = () => new HighlightedLabel(dom.append(this.descriptionContainer.element, dom.$('span.label-description')), !!options.supportCodicons);
		} else {
			this.descriptionNodeFactory = () => this._register(new FastLabelNode(dom.append(this.descriptionContainer.element, dom.$('span.label-description'))));
		}
	}

	get element(): HTMLElement {
		return this.domNode.element;
	}

	setLabel(label: string | string[], description?: string, options?: IIconLabelValueOptions): void {
		const classes = ['monaco-icon-label'];
		if (options) {
			if (options.extraClasses) {
				classes.push(...options.extraClasses);
			}

			if (options.italic) {
				classes.push('italic');
			}
		}

		this.domNode.className = classes.join(' ');
		this.domNode.title = options?.title || '';

		this.nameNode.setLabel(label, options);

		if (description || this.descriptionNode) {
			if (!this.descriptionNode) {
				this.descriptionNode = this.descriptionNodeFactory(); // description node is created lazily on demand
			}

			if (this.descriptionNode instanceof HighlightedLabel) {
				this.descriptionNode.set(description || '', options ? options.descriptionMatches : undefined);
				if (options?.descriptionTitle) {
					this.descriptionNode.element.title = options.descriptionTitle;
				} else {
					this.descriptionNode.element.removeAttribute('title');
				}
			} else {
				this.descriptionNode.textContent = description || '';
				this.descriptionNode.title = options?.descriptionTitle || '';
				this.descriptionNode.empty = !description;
			}
		}
	}
}

class Label {

	private label: string | string[] | undefined = undefined;
	private singleLabel: HTMLElement | undefined = undefined;

	constructor(private container: HTMLElement) { }

	setLabel(label: string | string[], options?: IIconLabelValueOptions): void {
		if (this.label === label) {
			return;
		}

		this.label = label;

		if (typeof label === 'string') {
			if (!this.singleLabel) {
				this.container.innerHTML = '';
				this.singleLabel = dom.append(this.container, dom.$('a.label-name'));
			}

			this.singleLabel.textContent = label;
		} else {
			this.container.innerHTML = '';
			this.singleLabel = undefined;

			for (let i = 0; i < label.length; i++) {
				const l = label[i];

				dom.append(this.container, dom.$('a.label-name', undefined, l));

				if (i < label.length - 1) {
					dom.append(this.container, dom.$('span.label-separator', undefined, options?.separator || '/'));
				}
			}
		}
	}
}

class LabelWithHighlights {

	private label: string | string[] | undefined = undefined;
	private singleLabel: HighlightedLabel | undefined = undefined;

	constructor(private container: HTMLElement, private supportCodicons: boolean) { }

	setLabel(label: string | string[], options?: IIconLabelValueOptions): void {
		if (this.label === label) {
			return;
		}

		this.label = label;

		if (typeof label === 'string') {
			if (!this.singleLabel) {
				this.container.innerHTML = '';
				this.singleLabel = new HighlightedLabel(dom.append(this.container, dom.$('a.label-name')), this.supportCodicons);
			}

			this.singleLabel.set(label, options?.matches, options?.title, options?.labelEscapeNewLines);
		} else {
			this.container.innerHTML = '';
			this.singleLabel = undefined;

			for (let i = 0; i < label.length; i++) {
				const l = label[i];

				const highlightedLabel = new HighlightedLabel(dom.append(this.container, dom.$('a.label-name')), this.supportCodicons);
				highlightedLabel.set(l, options?.matches, options?.title, options?.labelEscapeNewLines);

				if (i < label.length - 1) {
					dom.append(this.container, dom.$('span.label-separator', undefined, options?.separator || '/'));
				}
			}
		}
	}
}
