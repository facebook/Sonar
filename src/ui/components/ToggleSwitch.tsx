/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import styled from 'react-emotion';
import {colors} from './colors';
import Text from './Text';

export const StyledButton = styled('div')((props: {toggled: boolean}) => ({
  cursor: 'pointer',
  width: '30px',
  height: '16px',
  background: props.toggled ? colors.green : colors.grey,
  display: 'block',
  borderRadius: '100px',
  position: 'relative',
  marginLeft: '15px',
  flexShrink: 0,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '3px',
    left: props.toggled ? '18px' : '3px',
    width: '10px',
    height: '10px',
    background: 'white',
    borderRadius: '100px',
    transition: 'all cubic-bezier(0.3, 1.5, 0.7, 1) 0.3s',
  },
}));

const Label = styled(Text)({
  marginLeft: 7,
  marginRight: 7,
});

type Props = {
  /**
   * onClick handler.
   */
  onClick?: (event: React.MouseEvent) => void;
  /**
   * whether the button is toggled
   */
  toggled?: boolean;
  className?: string;
  label?: string;
};

/**
 * Toggle Button.
 *
 * **Usage**
 *
 * ```jsx
 * import {ToggleButton} from 'flipper';
 * <ToggleButton onClick={handler} toggled={boolean}/>
 * ```
 */
export default class ToggleButton extends React.Component<Props> {
  render() {
    return (
      <>
        <StyledButton
          className={this.props.className}
          toggled={this.props.toggled || false}
          onClick={this.props.onClick}
        />
        {this.props.label && <Label>{this.props.label}</Label>}
      </>
    );
  }
}
