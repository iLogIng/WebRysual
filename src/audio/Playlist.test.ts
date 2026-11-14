import { describe, expect, it } from "vitest";
import { Playlist } from "./Playlist";

function makeFile(name: string, lastModified = 1, content = "x"): File {
  return new File([content], name, { type: "audio/mpeg", lastModified });
}

describe("Playlist", () => {
  it("adds in order, dedupes, and only bumps revision on change", () => {
    const playlist = new Playlist();
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");

    playlist.add([a, b, a]);
    expect(playlist.size).toBe(2);
    expect(playlist.list().map((f) => f.name)).toEqual(["a.mp3", "b.mp3"]);
    expect(playlist.revision).toBe(1);

    playlist.add([a]);
    expect(playlist.size).toBe(2);
    expect(playlist.revision).toBe(1);
  });

  it("moves with wrap-around and handles an empty list", () => {
    const playlist = new Playlist();
    expect(playlist.move(1)).toBeNull();

    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);

    expect(playlist.move(1)?.name).toBe("a.mp3");
    expect(playlist.move(1)?.name).toBe("b.mp3");
    expect(playlist.move(-1)?.name).toBe("a.mp3");
    expect(playlist.move(-1)?.name).toBe("c.mp3");
  });

  it("clamps setIndex and handles an empty list", () => {
    const playlist = new Playlist();
    expect(playlist.setIndex(1)).toBeNull();
    expect(playlist.currentIndex).toBe(-1);

    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);
    expect(playlist.setIndex(-3)?.name).toBe("a.mp3");
    expect(playlist.currentIndex).toBe(0);
    expect(playlist.setIndex(99)?.name).toBe("c.mp3");
    expect(playlist.currentIndex).toBe(2);
  });

  it("selects the next item when the current first item is removed", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);
    playlist.setIndex(0);

    expect(playlist.remove(0)?.name).toBe("a.mp3");
    expect(playlist.current?.name).toBe("b.mp3");
    expect(playlist.currentIndex).toBe(0);
  });

  it("selects the previous item when the current last item is removed", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);
    playlist.setIndex(2);

    expect(playlist.remove(2)?.name).toBe("c.mp3");
    expect(playlist.current?.name).toBe("b.mp3");
    expect(playlist.currentIndex).toBe(1);
  });

  it("keeps the current file when an earlier item is removed", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);
    playlist.setIndex(2);

    expect(playlist.remove(0)?.name).toBe("a.mp3");
    expect(playlist.current?.name).toBe("c.mp3");
    expect(playlist.currentIndex).toBe(1);
  });

  it("keeps the index when a later item is removed", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3"), makeFile("b.mp3"), makeFile("c.mp3")]);
    playlist.setIndex(0);

    expect(playlist.remove(2)?.name).toBe("c.mp3");
    expect(playlist.current?.name).toBe("a.mp3");
    expect(playlist.currentIndex).toBe(0);
  });

  it("empties the list when the only item is removed", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3")]);
    playlist.setIndex(0);

    expect(playlist.remove(0)?.name).toBe("a.mp3");
    expect(playlist.size).toBe(0);
    expect(playlist.currentIndex).toBe(-1);
    expect(playlist.current).toBeNull();
  });

  it("ignores invalid remove indexes", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3"), makeFile("b.mp3")]);
    const revision = playlist.revision;

    expect(playlist.remove(-1)).toBeNull();
    expect(playlist.remove(2)).toBeNull();
    expect(playlist.revision).toBe(revision);
    expect(playlist.size).toBe(2);
  });

  it("clears content and bumps revision only when non-empty", () => {
    const playlist = new Playlist();
    playlist.add([makeFile("a.mp3")]);
    const revision = playlist.revision;

    playlist.clear();
    expect(playlist.size).toBe(0);
    expect(playlist.currentIndex).toBe(-1);
    expect(playlist.revision).toBe(revision + 1);

    playlist.clear();
    expect(playlist.revision).toBe(revision + 1);
  });
});
