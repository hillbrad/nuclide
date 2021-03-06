'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {
  NuclideRemoteAuthMethods,
  NuclideRemoteConnectionParamsWithPassword,
} from './connection-types';

import {AtomInput} from '../../nuclide-ui/lib/AtomInput';
import {CompositeDisposable} from 'atom';
import {RadioGroup} from '../../nuclide-ui/lib/RadioGroup';
import {React, ReactDOM} from 'react-for-atom';
import {SshHandshake} from '../../nuclide-remote-connection';

const {SupportedMethods} = SshHandshake;
const authMethods = [
  SupportedMethods.PASSWORD,
  SupportedMethods.SSL_AGENT,
  SupportedMethods.PRIVATE_KEY,
];

type DefaultProps = {
  autoFocus: boolean;
};

type Props = {
  autoFocus: boolean;
  initialUsername: string;
  initialServer: string;
  initialCwd: string;
  initialRemoteServerCommand: string;
  initialSshPort: string;
  initialPathToPrivateKey: string;
  initialAuthMethod: $Enum<typeof SupportedMethods>;
  onConfirm: Function;
  onCancel: Function;
};

type State = {
  cwd: string;
  pathToPrivateKey: string;
  remoteServerCommand: string;
  selectedAuthMethodIndex: number;
  server: string;
  sshPort: string;
  username: string;
};

/** Component to prompt the user for connection details. */
export default class ConnectionDetailsForm extends React.Component {
  static defaultProps: DefaultProps = {
    autoFocus: true,
  };

  props: Props;
  state: State;

  _disposables: ?CompositeDisposable;

  constructor(props: Props) {
    super(props);
    this.state = {
      username: props.initialUsername,
      server: props.initialServer,
      cwd: props.initialCwd,
      remoteServerCommand: props.initialRemoteServerCommand,
      sshPort: props.initialSshPort,
      pathToPrivateKey: props.initialPathToPrivateKey,
      selectedAuthMethodIndex: authMethods.indexOf(props.initialAuthMethod),
    };
  }

  handleAuthMethodChange(newIndex: number) {
    this.setState({
      selectedAuthMethodIndex: newIndex,
    });
  }

  _onKeyUp(e: SyntheticKeyboardEvent): void {
    if (e.key === 'Enter') {
      this.props.onConfirm();
    }

    if (e.key === 'Escape') {
      this.props.onCancel();
    }
  }

  _handlePasswordInputClick(event: SyntheticEvent): void {
    const passwordAuthMethodIndex = authMethods.indexOf(SupportedMethods.PASSWORD);
    this.setState(
      {
        selectedAuthMethodIndex: passwordAuthMethodIndex,
      },
      () => {
        ReactDOM.findDOMNode(this.refs.password).focus();
      }
    );
  }

  _handleKeyFileInputClick(event: SyntheticEvent): void {
    const privateKeyAuthMethodIndex = authMethods.indexOf(SupportedMethods.PRIVATE_KEY);
    this.setState(
      {
        selectedAuthMethodIndex: privateKeyAuthMethodIndex,
      },
      () => {
        // when setting this immediately, Atom will unset the focus...
        setTimeout(() => {
          ReactDOM.findDOMNode(this.refs.pathToPrivateKey).focus();
        }, 0);
      }
    );
  }

  render(): React.Element<any> {
    const activeAuthMethod = authMethods[this.state.selectedAuthMethodIndex];
    // We need native-key-bindings so that delete works and we need
    // _onKeyUp so that escape and enter work
    const passwordLabel = (
      <div className="nuclide-auth-method">
        <div className="nuclide-auth-method-label">
          Password:
        </div>
        <div className="nuclide-auth-method-input nuclide-auth-method-password">
          <input type="password"
            className="nuclide-password native-key-bindings"
            disabled={activeAuthMethod !== SupportedMethods.PASSWORD}
            ref="password"
            onClick={this._handlePasswordInputClick.bind(this)}
            onKeyUp={this._onKeyUp.bind(this)}
          />
        </div>
      </div>
    );
    const privateKeyLabel = (
      <div className="nuclide-auth-method">
        <div className="nuclide-auth-method-label">
          Private Key File:
        </div>
        <div className="nuclide-auth-method-input nuclide-auth-method-privatekey">
          <AtomInput
            ref="pathToPrivateKey"
            disabled={activeAuthMethod !== SupportedMethods.PRIVATE_KEY}
            initialValue={this.state.pathToPrivateKey}
            onClick={this._handleKeyFileInputClick.bind(this)}
            placeholder="Path to private key"
            unstyled={true}
          />
        </div>
      </div>
    );
    const sshAgentLabel = (
      <div className="nuclide-auth-method">
        Use ssh-agent
      </div>
    );
    return (
      <div>
        <div className="form-group">
          <label>Username:</label>
          <AtomInput
            initialValue={this.state.username}
            ref="username"
            unstyled={true}
          />
        </div>
        <div className="form-group row">
          <div className="col-xs-9">
            <label>Server:</label>
            <AtomInput
              initialValue={this.state.server}
              ref="server"
              unstyled={true}
            />
          </div>
          <div className="col-xs-3">
            <label>SSH Port:</label>
            <AtomInput
              initialValue={this.state.sshPort}
              ref="sshPort"
              unstyled={true}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Initial Directory:</label>
          <AtomInput
            initialValue={this.state.cwd}
            ref="cwd"
            unstyled={true}
          />
        </div>
        <div className="form-group">
          <label>Authentication method:</label>
          <RadioGroup
            optionLabels={[
              passwordLabel,
              sshAgentLabel,
              privateKeyLabel,
            ]}
            onSelectedChange={this.handleAuthMethodChange.bind(this)}
            selectedIndex={this.state.selectedAuthMethodIndex}
          />
        </div>
        <div className="form-group">
          <label>Remote Server Command:</label>
          <AtomInput
            initialValue={this.state.remoteServerCommand}
            ref="remoteServerCommand"
            unstyled={true}
          />
        </div>
      </div>
    );
  }

  componentDidMount() {
    const disposables = new CompositeDisposable();
    this._disposables = disposables;
    const root = ReactDOM.findDOMNode(this);

    // Hitting enter when this panel has focus should confirm the dialog.
    disposables.add(atom.commands.add(
      root,
      'core:confirm',
      event => this.props.onConfirm()
    ));

    // Hitting escape should cancel the dialog.
    disposables.add(atom.commands.add(
      'atom-workspace',
      'core:cancel',
      event => this.props.onCancel()
    ));

    if (this.props.autoFocus) {
      this.refs.username.focus();
    }
  }

  componentWillUnmount() {
    if (this._disposables) {
      this._disposables.dispose();
      this._disposables = null;
    }
  }

  getFormFields(): NuclideRemoteConnectionParamsWithPassword {
    return {
      username: this._getText('username'),
      server: this._getText('server'),
      cwd: this._getText('cwd'),
      remoteServerCommand: this._getText('remoteServerCommand'),
      sshPort: this._getText('sshPort'),
      pathToPrivateKey: this._getText('pathToPrivateKey'),
      authMethod: this._getAuthMethod(),
      password: this._getPassword(),
    };
  }

  // Note: 'password' is not settable. The only exposed method is 'clearPassword'.
  setFormFields(fields: {
    username?: string;
    server?: string;
    cwd?: string;
    remoteServerCommand?: string;
    sshPort?: string;
    pathToPrivateKey?: string;
    authMethod?: NuclideRemoteAuthMethods;
  }): void {
    this._setText('username', fields.username);
    this._setText('server', fields.server);
    this._setText('cwd', fields.cwd);
    this._setText('remoteServerCommand', fields.remoteServerCommand);
    this._setText('sshPort', fields.sshPort);
    this._setText('pathToPrivateKey', fields.pathToPrivateKey);
    this._setAuthMethod(fields.authMethod);
  }

  _getText(fieldName: string): string {
    return (this.refs[fieldName] && this.refs[fieldName].getText().trim()) || '';
  }

  _setText(fieldName: string, text: ?string): void {
    if (text == null) {
      return;
    }
    const atomInput = this.refs[fieldName];
    if (atomInput) {
      atomInput.setText(text);
    }
  }

  _getAuthMethod(): string {
    return authMethods[this.state.selectedAuthMethodIndex];
  }

  _setAuthMethod(authMethod: ?NuclideRemoteAuthMethods): void {
    if (authMethod == null) {
      return;
    }
    const newIndex = authMethods.indexOf(authMethod);
    if (newIndex >= 0) {
      this.setState({selectedAuthMethodIndex: newIndex});
    }
  }

  _getPassword(): string {
    return (this.refs.password && ReactDOM.findDOMNode(this.refs.password).value) || '';
  }

  clearPassword(): void {
    const passwordInput = this.refs.password;
    if (passwordInput) {
      passwordInput.value = '';
    }
  }
}
