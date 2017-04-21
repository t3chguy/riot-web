/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

const React = require('react');

const MatrixClientPeg = require('matrix-react-sdk/lib/MatrixClientPeg');
const dis = require('matrix-react-sdk/lib/dispatcher');
const sdk = require('matrix-react-sdk');
const Modal = require('matrix-react-sdk/lib/Modal');
const Resend = require("matrix-react-sdk/lib/Resend");
import * as UserSettingsStore from 'matrix-react-sdk/lib/UserSettingsStore';

module.exports = React.createClass({
    displayName: 'MessageContextMenu',

    propTypes: {
        /* the MatrixEvent associated with the context menu */
        mxEvent: React.PropTypes.object.isRequired,

        /* an optional EventTileOps implementation that can be used to unhide preview widgets */
        eventTileOps: React.PropTypes.object,

        /* callback called when the menu is dismissed */
        onFinished: React.PropTypes.func,
    },

    onResendClick: function() {
        Resend.resend(this.props.mxEvent);
        if (this.props.onFinished) this.props.onFinished();
    },

    onViewSourceClick: function() {
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createDialog(ViewSource, {
            content: this.props.mxEvent.event,
        }, 'mx_Dialog_viewsource');
        if (this.props.onFinished) this.props.onFinished();
    },

    onViewClearSourceClick: function() {
        const ViewSource = sdk.getComponent('structures.ViewSource');
        Modal.createDialog(ViewSource, {
            // FIXME: _clearEvent is private
            content: this.props.mxEvent._clearEvent,
        }, 'mx_Dialog_viewsource');
        if (this.props.onFinished) this.props.onFinished();
    },

    onRedactClick: function() {
        const ConfirmRedactDialog = sdk.getComponent("dialogs.ConfirmRedactDialog");
        Modal.createDialog(ConfirmRedactDialog, {
            onFinished: (proceed) => {
                if (!proceed) return;

                MatrixClientPeg.get().redactEvent(
                    this.props.mxEvent.getRoomId(), this.props.mxEvent.getId()
                ).catch(function(e) {
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    // display error message stating you couldn't delete this.
                    const code = e.errcode || e.statusCode;
                    Modal.createDialog(ErrorDialog, {
                        title: "Error",
                        description: "You cannot delete this message. (" + code + ")",
                    });
                }).done();
            },
        }, 'mx_Dialog_confirmredact');
        if (this.props.onFinished) this.props.onFinished();
    },

    onCancelSendClick: function() {
        Resend.removeFromQueue(this.props.mxEvent);
        if (this.props.onFinished) this.props.onFinished();
    },

    onForwardClick: function() {
        dis.dispatch({
            action: 'forward_message',
            content: this.props.mxEvent.getContent(),
        });
        this.closeMenu();
    },

    closeMenu: function() {
        if (this.props.onFinished) this.props.onFinished();
    },

    onUnhidePreviewClick: function() {
        if (this.props.eventTileOps) {
            this.props.eventTileOps.unhideWidget();
        }
        if (this.props.onFinished) this.props.onFinished();
    },

    onQuoteClick: function() {
        console.log(this.props.mxEvent);
        dis.dispatch({
            action: 'quote',
            event: this.props.mxEvent,
        });
    },

    render: function() {
        const eventStatus = this.props.mxEvent.status;
        let resendButton;
        let redactButton;
        let cancelButton;
        let forwardButton;
        let viewSourceButton;
        let viewClearSourceButton;
        let unhidePreviewButton;
        let permalinkButton;
        let externalURLButton;

        if (eventStatus === 'not_sent') {
            resendButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onResendClick}>
                    Resend
                </div>
            );
        }

        if (!eventStatus && !this.props.mxEvent.isRedacted()) { // sent and not redacted
            redactButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onRedactClick}>
                    Redact
                </div>
            );
        }

        if (eventStatus === "queued" || eventStatus === "not_sent") {
            cancelButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onCancelSendClick}>
                    Cancel Sending
                </div>
            );
        }

        if (this.props.mxEvent.getType() === 'm.room.message') {
            forwardButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onForwardClick}>
                    Forward Message
                </div>
            );
        }

        viewSourceButton = (
            <div className="mx_MessageContextMenu_field" onClick={this.onViewSourceClick}>
                View Source
            </div>
        );

        if (this.props.mxEvent.getType() !== this.props.mxEvent.getWireType()) {
            viewClearSourceButton = (
                <div className="mx_MessageContextMenu_field" onClick={this.onViewClearSourceClick}>
                    View Decrypted Source
                </div>
            );
        }

        if (this.props.eventTileOps) {
            if (this.props.eventTileOps.isWidgetHidden()) {
                unhidePreviewButton = (
                    <div className="mx_MessageContextMenu_field" onClick={this.onUnhidePreviewClick}>
                        Unhide Preview
                    </div>
                );
            }
        }

        // XXX: if we use room ID, we should also include a server where the event can be found (other than in the domain of the event ID)
        permalinkButton = (
            <div className="mx_MessageContextMenu_field">
                <a href={ "https://matrix.to/#/" + this.props.mxEvent.getRoomId() +"/"+ this.props.mxEvent.getId() }
                  target="_blank" rel="noopener" onClick={ this.closeMenu }>Permalink</a>
            </div>
        );

        const quoteButton = (
            <div className="mx_MessageContextMenu_field" onClick={this.onQuoteClick}>
                Quote
            </div>
        );

        // Bridges can provide a 'external_url' to link back to the source.
        if( typeof(this.props.mxEvent.event.content.external_url) === "string") {
          externalURLButton = (
              <div className="mx_MessageContextMenu_field">
                  <a href={ this.props.mxEvent.event.content.external_url }
                    rel="noopener" target="_blank" onClick={ this.closeMenu }>Source URL</a>
              </div>
          );
        }


        return (
            <div>
                {resendButton}
                {redactButton}
                {cancelButton}
                {forwardButton}
                {viewSourceButton}
                {viewClearSourceButton}
                {unhidePreviewButton}
                {permalinkButton}
                {UserSettingsStore.isFeatureEnabled('rich_text_editor') ? quoteButton : null}
                {externalURLButton}
            </div>
        );
    },
});
