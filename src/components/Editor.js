import React, { useEffect, useRef } from 'react';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets } from '@codemirror/autocomplete';
import { html } from '@codemirror/lang-html';
import { defaultKeymap } from '@codemirror/commands'; // Import default keymap
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current) return; // Prevent initializing twice

        // Set up the editor
        const startState = EditorState.create({
            doc: '',
            extensions: [
                lineNumbers(), // Line numbers extension
                javascript(),
                oneDark,
                closeBrackets(),
                html(),
                keymap.of(defaultKeymap), // Add default keymap for basic key bindings
            ],
        });

        // Create the EditorView and attach it to the DOM
        editorRef.current = new EditorView({
            state: startState,
            parent: document.querySelector('#realtimeEditor'),
        });

        // Handle changes
        editorRef.current.updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const code = editorRef.current.state.doc.toString();
                onCodeChange(code);
                if (socketRef.current) {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            }
        });

        // Listen for code changes from the server
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null && editorRef.current) {
                    const transaction = editorRef.current.state.update({
                        changes: { from: 0, to: editorRef.current.state.doc.length, insert: code },
                    });
                    editorRef.current.dispatch(transaction);
                }
            });
        }

        // Cleanup function
        return () => {
            if (socketRef.current) {
                if (socketRef.current.disconnect) {
                    socketRef.current.disconnect();
                }
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
            if (editorRef.current) {
                editorRef.current.destroy();
            }
        };
    }, [socketRef]);

    return <div id="realtimeEditor" style={{ height: '100%', width: '100%' }}></div>;
};

export default Editor;
