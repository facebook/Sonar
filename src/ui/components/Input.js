/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import styled from '../styled/index.js';
import {colors} from './colors.js';

export const inputStyle = {
  border: `1px solid ${colors.light15}`,
  borderRadius: 4,
  font: 'inherit',
  fontSize: '1em',
  height: (props: Object) => (props.compact ? '17px' : '28px'),
  lineHeight: (props: Object) => (props.compact ? '17px' : '28px'),
  marginRight: 5,

  '&:disabled': {
    backgroundColor: '#ddd',
    borderColor: '#ccc',
    cursor: 'not-allowed',
  },
};

const Input = styled.textInput(
  {
    ...inputStyle,
    padding: props => (props.compact ? '0 5px' : '0 10px'),
  },
  {
    ignoreAttributes: ['compact'],
  },
);

Input.defaultProps = {
  type: 'text',
};

export default Input;
