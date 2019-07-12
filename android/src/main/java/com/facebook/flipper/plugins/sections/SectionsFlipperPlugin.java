/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.sections;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.plugins.sections.ChangesetDebug.ChangesetListener;

public class SectionsFlipperPlugin implements FlipperPlugin, ChangesetListener {

  private FlipperConnection mConnection;

  @Override
  public String getId() {
    return "Sections";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    mConnection = connection;
    ChangesetDebug.setListener(this);
  }

  @Override
  public void onDisconnect() throws Exception {}

  @Override
  public boolean runInBackground() {
    return false;
  }

  /**
   * @param name Name of event
   * @param isAsync Whether the event was sync or async
   * @param surfaceId SectionTree tag
   * @param id Changeset generation unique id
   * @param tree Representation of the SectionTree hierarchy
   * @param changesetData Changeset information
   */
  @Override
  public void onChangesetApplied(
      String name,
      boolean isAsync,
      String surfaceId,
      String id,
      FlipperArray tree,
      FlipperObject changesetData) {
    if (mConnection == null) {
      return;
    }
    mConnection.send(
        "addEvent",
        new FlipperObject.Builder()
            .put("id", id)
            .put("update_mode", isAsync ? 0 : 1)
            .put("reason", name)
            .put("surface_key", surfaceId)
            .put("tree_generation_timestamp", 10000) // TODO
            .put("stack_trace", new FlipperArray.Builder().build())
            .put("payload", new FlipperObject.Builder().build())
            .build());

    mConnection.send(
        "updateTreeGenerationHierarchyGeneration",
        new FlipperObject.Builder()
            .put("id", id)
            .put("hierarchy_generation_timestamp", 10000) // TODO
            .put("hierarchy_generation_duration", 0) // TODO
            .put("tree", tree)
            .put("reason", name)
            .build());

    // Not sure both CHANGESET_GENERATED and CHANGESET_APPLIED need to sent here, need
    // to investigate a bit more.
    mConnection.send(
        "updateTreeGenerationChangesetGeneration",
        new FlipperObject.Builder()
            .put("type", "CHANGESET_GENERATED")
            .put("identifier", id)
            .put("tree_generation_id", "" + id)
            .put("timestamp", 10000) // TODO
            .put("duration", 0) // TODO
            .put("changeset", changesetData)
            .build());

    mConnection.send(
        "updateTreeGenerationChangesetApplication",
        new FlipperObject.Builder()
            .put("type", "CHANGESET_APPLIED")
            .put("identifier", id)
            .put("tree_generation_id", id)
            .put("timestamp", 10000) // TODO
            .put("duration", 0) // TODO
            .put("changeset", changesetData)
            .build());
  }
}
