
/** To demonstrate code actions associated with Diagnostics problems, this file provides a mock diagnostics entries. */

import * as vscode from 'vscode';
let dayjs = require('dayjs');
let utc = require('dayjs/plugin/utc');
let timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);


/** Code that is used to associate diagnostic entries with code actions. */
export const DATE_MENTION = 'date_finder';

/** String to detect in the text document. Should be a regex  */
const SHORT_DATE_REGEX = /\d{4}-\d{2}-\d{2}/g; // matches dates like '2019-01-01'
//add regex to match a date in ISO 8061 format - this is so ugly I wanna puke a bit, but should sover tons of 
const LONG_DATE_REGEX = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/g;

/**
 * Analyzes the text document for dates in ISO 8061 format.

 * @param doc text document to analyze
 * @param dateTimeDiagnostics diagnostic collection
 */
export function refreshDiagnostics(doc: vscode.TextDocument, dateTimeDiagnostics: vscode.DiagnosticCollection, context: vscode.ExtensionContext): void {
	const diagnostics: vscode.Diagnostic[] = [];

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
			
			const dt: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
				gutterIconPath: context.asAbsolutePath('src/img/date.png'),
				gutterIconSize: 'cover',
				
				light: {
					// this color will be used in light color themes
					backgroundColor: 'rgba(12, 180, 100, 0.1)',
				},
				dark: {
					// this color will be used in dark color themes
					backgroundColor: 'rgba(12, 180, 100, 0.1)',
				}   
			});
			if (vscode.window.activeTextEditor) {
				const index = lineOfText.text.indexOf(matchedString);
				vscode.window.activeTextEditor.setDecorations(dt, [new vscode.Range(lineIndex, index, lineIndex, index + matchedString.length)]);
			}
			diagnostics.push(createDiagnostic(doc, lineOfText, lineIndex, matchedString));
		}
		
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
	return diagnostic;
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, dateDiagnostics: vscode.DiagnosticCollection): void {
	
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, dateDiagnostics, context);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, dateDiagnostics, context);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, dateDiagnostics, context))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => dateDiagnostics.delete(doc.uri))
	);

}