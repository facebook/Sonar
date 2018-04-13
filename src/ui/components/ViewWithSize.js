/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {Component} from 'react';

type ViewWithSizeProps = {
  onSize: (width: number, height: number) => any,
};

type ViewWithSizeState = {|
  width: number,
  height: number,
|};

export default class ViewWithSize extends Component<
  ViewWithSizeProps,
  ViewWithSizeState,
> {
  constructor(props: ViewWithSizeProps, context: Object) {
    super(props, context);
    this.state = {height: window.innerHeight, width: window.innerWidth};
  }

  _onResize: Function;

  componentDidMount() {
    this._onResize = () => {
      this.setState({height: window.innerHeight, width: window.innerWidth});
    };
    window.addEventListener('resize', this._onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  render() {
    return this.props.onSize(this.state.width, this.state.height);
  }
}
