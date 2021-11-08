
/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from 'vscode';
import { DatesDiagnostics } from './extension';
let dayjs = require('dayjs');
let utc = require('dayjs/plugin/utc');
let timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


/** Code that is used to associate diagnostic entries with code actions. */
export const DATE_MENTION = 'date_finder';

/** String to detect in the text document. Should be a regex  */
const SHORT_DATE_REGEX = /\d{4}-\d{2}-\d{2}/g; // matches dates like '2019-01-01'
//add regex to match a date in ISO 8061 format - this is so ugly I wanna puke a bit, but it should cover a few cases of dates. POC ONLY! 
const LONG_DATE_REGEX = /(\d{4}-[01]\d-[0-3]\d[T ][0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|(Z)|( \+\d{4})|[,.]\d{3}))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/g;


/**
 * Analyzes the text document for dates in ISO 8061 format.

 * @param doc text document to analyze
 * @param dateTimeDiagnostics diagnostic collection
 */
export function refreshDiagnostics(doc: vscode.TextDocument, dateTimeDiagnostics: vscode.DiagnosticCollection, context: vscode.ExtensionContext, dt: vscode.TextEditorDecorationType): void {
	const diagnostics: vscode.Diagnostic[] = [];
	const decorations = [];

	for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
		const lineOfText = doc.lineAt(lineIndex);
		//add regex match of a string
		let r = new RegExp(SHORT_DATE_REGEX, 'g');		
		let shortMatch = r.exec(lineOfText.text);
		let r2 = new RegExp(LONG_DATE_REGEX, 'g');
		let longmatch = r2.exec(lineOfText.text);
		
		let matchedString = '';
		if (longmatch) {
			matchedString = longmatch[0];
		}else if (shortMatch){
			matchedString = shortMatch[0];
		}
		if (dayjs(matchedString).unix()) { 
			
			// if (vscode.window.activeTextEditor) {
			// 	const index = lineOfText.text.indexOf(matchedString);
			// 	vscode.window.activeTextEditor.setDecorations(dt, [new vscode.Range(lineIndex, index, lineIndex, index + matchedString.length)]);
			// }
			decorations.push(createDecoration(doc, lineOfText, lineIndex, matchedString,context));
			diagnostics.push(createDiagnostic(doc, lineOfText, lineIndex, matchedString));
		}
		
	}
	if (vscode.window.activeTextEditor) {
		vscode.window.activeTextEditor.setDecorations(dt, decorations);
	}
	dateTimeDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number, matchedString: string): vscode.Diagnostic {
	// find where in the line of thet the 'date' is mentioned
	const index = lineOfText.text.indexOf(matchedString);
	// create range that represents, where in the document the word is
	const range = new vscode.Range(lineIndex, index, lineIndex, index + matchedString.length);
	const format = dayjs(matchedString).local().format('MMMM DD, YYYY hh:mm');
	const diagnostic = new vscode.Diagnostic(range, `Human date : ${format} ${dayjs.tz.guess()} \nUnix Timestamp: ${dayjs(matchedString).unix()}`,
		vscode.DiagnosticSeverity.Hint);
	diagnostic.code = DATE_MENTION;
	diagnostic.range = range;
	return diagnostic;
}

function createDecoration(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number, matchedString: string, context: vscode.ExtensionContext) {
	// find where in the line of thet the 'date' is mentioned
	const index = lineOfText.text.indexOf(matchedString);
	// create range that represents, where in the document the word is
	return new vscode.Range(lineIndex, index, lineIndex, index + matchedString.length);
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, dateDiagnostics: vscode.DiagnosticCollection, dt: vscode.TextEditorDecorationType): void {
	
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, dateDiagnostics, context, dt);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, dateDiagnostics, context, dt);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, dateDiagnostics, context, dt))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => dateDiagnostics.delete(doc.uri))
	);

}