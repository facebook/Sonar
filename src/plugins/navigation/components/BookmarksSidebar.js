/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {DetailSidebar, FlexCenter, styled, colors} from 'flipper';

import type {Bookmark} from '../flow-types';

type Props = {|
  bookmarks: Map<string, Bookmark>,
  onNavigate: string => void,
|};

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

const BookmarksList = styled('div')({
  color: colors.macOSTitleBarIcon,
  overflowY: 'scroll',
  overflowX: 'hidden',
  height: '100%',
  '.bookmark-container': {
    width: '100%',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  '.bookmark-container:hover': {
    backgroundColor: 'rgba(155, 155, 155, 0.2)',
  },
  '.bookmark-container:active': {
    backgroundColor: '#4d84f5',
    color: '#FFF',
  },
  '.bookmark-common-name': {
    fontSize: 14,
    overflowX: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
  },
  '.bookmark-uri': {
    fontSize: 10,
    overflowX: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
  },
});

const alphabetizeBookmarkCompare = (b1: Bookmark, b2: Bookmark) => {
  return b1.uri < b2.uri ? -1 : b1.uri > b2.uri ? 1 : 0;
};

export default (props: Props) => {
  const {bookmarks, onNavigate} = props;
  return (
    <DetailSidebar>
      {bookmarks.size === 0 ? (
        <NoData grow>No Bookmarks</NoData>
      ) : (
        <BookmarksList>
          {[...bookmarks.values()]
            .sort(alphabetizeBookmarkCompare)
            .map((bookmark, idx) => (
              <div
                key={idx}
                className="bookmark-container"
                role="button"
                tabIndex={0}
                onClick={() => {
                  onNavigate(bookmark.uri);
                }}>
                <div className="bookmark-common-name">
                  {bookmark.commonName}
                </div>
                <div className="bookmark-uri">{bookmark.uri}</div>
              </div>
            ))}
        </BookmarksList>
      )}
    </DetailSidebar>
  );
};
