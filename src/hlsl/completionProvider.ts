'use strict';

import { CompletionItemProvider, CompletionItem, CompletionItemKind, CancellationToken, TextDocument, Position, Range, TextEdit, workspace, window } from 'vscode';
import hlslGlobals = require('./hlslGlobals');
import { FILE } from 'dns';
import fs = require('fs');


export default class HLSLCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters = ['.'];

    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        let result: CompletionItem[] = [];

        let enable = workspace.getConfiguration('hlsl').get<boolean>('suggest.basic', true);
        if (!enable) {
			console.log("Autocompletion disabled !");
            return Promise.resolve(result);
        }

        var range = document.getWordRangeAtPosition(position);
        var prefix = range ? document.getText(range) : '';
        if (!range) {
            range = new Range(position, position);
        }

        var added: any = {};
        var createNewProposal = function (kind: CompletionItemKind, name: string, entry: hlslGlobals.IEntry, type?: string): CompletionItem {
            var proposal: CompletionItem = new CompletionItem(name);
            proposal.kind = kind;
            if (entry) {
                if (entry.description) {
                    proposal.documentation = entry.description;
                }
                if (entry.parameters) {
                    let signature = type ? '(' + type + ') ' : '';
                    signature += name;
                    signature += '(';
                    if (entry.parameters && entry.parameters.length != 0) {
                        let params = '';
                        entry.parameters.forEach(p => params += p.label + ',');
                        signature += params.slice(0, -1);
                    }
                    signature += ')';
                    proposal.detail = signature;
				}
				else
					proposal.detail = "(void)";
            }
            return proposal;
        };

        var matches = (name: string) => {
            return prefix.length === 0 || name.length >= prefix.length && name.substr(0, prefix.length) === prefix;
        };

        for (var name in hlslGlobals.datatypes) {
            if (hlslGlobals.datatypes.hasOwnProperty(name) && matches(name)) {
                added[name] = true;
                result.push(createNewProposal(CompletionItemKind.TypeParameter, name, hlslGlobals.datatypes[name], 'datatype'));
            }
        }

        for (var name in hlslGlobals.intrinsicfunctions) {
            if (hlslGlobals.intrinsicfunctions.hasOwnProperty(name) && matches(name)) {
                added[name] = true;
                result.push(createNewProposal(CompletionItemKind.Function, name, hlslGlobals.intrinsicfunctions[name], 'function'));
            }
        }

        for (var name in hlslGlobals.semantics) {
            if (hlslGlobals.semantics.hasOwnProperty(name) && matches(name)) {
                added[name] = true;
                result.push(createNewProposal(CompletionItemKind.Reference, name, hlslGlobals.semantics[name], 'semantic'));
            }
        }

        for (var name in hlslGlobals.semanticsNum) {
            if (hlslGlobals.semanticsNum.hasOwnProperty(name) && matches(name)) {
                added[name] = true;
                result.push(createNewProposal(CompletionItemKind.Reference, name, hlslGlobals.semanticsNum[name], 'semantic'));
            }
        }

        for (var name in hlslGlobals.keywords) {
            if (hlslGlobals.keywords.hasOwnProperty(name) && matches(name)) {
                added[name] = true;
                result.push(createNewProposal(CompletionItemKind.Keyword, name, hlslGlobals.keywords[name], 'keyword'));
            }
		}
		
		// var files = workspace.findFiles("**/*.hlsl").then(u => {
		var files = workspace.findFiles("*.hlsl").then(u => {
			u.forEach(uri => console.log(uri.path))
			var promises = []
			u.forEach(uri => {
				promises.push(new Promise((resolve, reject) => {
					fs.readFile(uri.path, (err, data) => {
						if (err)
						{
							console.log("error: " + err);
							reject();
							return ;
						}
						RegisterCompletionSymbols(data.toString());
						resolve();
					});
				}));
			})

			// Wait for all files to be parsed
			Promise.all(promises).then(() => {
				console.log("resolve !");
				return Promise.resolve(result);
			});
		});

		function RegisterCompletionSymbols(fileContent: string)
		{
			var functionMatch = /^\w+\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\((.*)\)/mg;
			var match: RegExpExecArray = null;
			while (match = functionMatch.exec(fileContent)) {
				var word = match[1];
				var paramsString = match[2];
				var params = paramsString.split(',');
				var ps = [];
				params.forEach(c => {
					ps.push({
						label: c,
						document: "nope"
					});
				})
				if (params.length == 0)
				{
					ps.push({
						label: "void"
					})
				}
				console.log("params: " + word);
				console.log(ps);

				var e : hlslGlobals.IEntry = {
					parameters: ps
				};
				if (!added[word]) {
					added[word] = true;
					result.push(createNewProposal(CompletionItemKind.Function, word, e));
					console.log("added word: " + word);
					console.log(result.length);
				}
			}
		}
    }
}