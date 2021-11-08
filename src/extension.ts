import dayjs = require('dayjs');
import * as vscode from 'vscode';
import { subscribeToDocumentChanges, DATE_MENTION } from './diagnostics';

const COMMAND = 'code-actions-sample.command';
const COPY_UTC = 'timezonify.copy';
var ncp = require("copy-paste");

export function activate(context: vscode.ExtensionContext) {

	const dateDiagnostics = vscode.languages.createDiagnosticCollection("date");
	context.subscriptions.push(dateDiagnostics);

	subscribeToDocumentChanges(context, dateDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('*', new DatesDiagnostics(), {
			providedCodeActionKinds: DatesDiagnostics.providedCodeActionKinds
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND, () => vscode.env.openExternal(vscode.Uri.parse('https://unicode.org/emoji/charts-12.0/full-emoji-list.html')))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(COPY_UTC, (utc) => ncp.copy(utc, function () {
            vscode.window.showInformationMessage('Copied UTC to clipboard');
          }))
	);


}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class DatesDiagnostics implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
		// for each diagnostic entry that has the matching `code`, create a code action command
		let copyActions = context.diagnostics
			.filter(diagnostic => diagnostic.code === DATE_MENTION)
			.map(diagnostic => this.createCopyAction(diagnostic));
        let replaceActions = context.diagnostics
            .filter(diagnostic => diagnostic.code === DATE_MENTION)
            .map(diagnostic => this.createFix(document, range, diagnostic));

        return [...copyActions,
                ...replaceActions
        ];
	}

	private createCopyAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Copy UTC timestamp', vscode.CodeActionKind.QuickFix);
        let utcTimestamp = diagnostic.message.split('Timestamp: ')[1];
		action.command = { command: COPY_UTC, title: 'Copy the UTC timestamp to clipboard', tooltip: 'This will copy the UTC timestamp of the date to your clipboard.', arguments: [utcTimestamp] };
		action.diagnostics = [diagnostic];
		action.isPreferred = true;
		return action;
	}

    private createFix(document: vscode.TextDocument, range: vscode.Range, diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const fix = new vscode.CodeAction(`Convert to ISO 8601 formated date`, vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();
        let formatedDate = diagnostic.message.split('Timestamp: ')[1];
		fix.edit.replace(document.uri, new vscode.Range(range.start, range.start.translate(0, formatedDate.length)), dayjs.unix(parseInt(formatedDate)).toISOString());
		return fix;
	}
}