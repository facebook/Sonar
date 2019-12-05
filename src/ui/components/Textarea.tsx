/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from 'react-emotion';
import {inputStyle} from './Input';

const Textarea = styled('textarea')(
  ({
    compact,
    readOnly,
    valid,
  }: {
    compact?: boolean;
    readOnly?: boolean;
    valid?: boolean;
  }) => ({
    ...inputStyle({
      compact: compact || false,
      readOnly: readOnly || false,
      valid: valid !== false,
    }),
    lineHeight: 'normal',
    padding: compact ? '5px' : '8px',
    resize: 'none',
  }),
);
Textarea.displayName = 'Textarea';

export default Textarea;
