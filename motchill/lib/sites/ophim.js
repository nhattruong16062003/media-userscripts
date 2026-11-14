  function ophimAdapter(id, doc, pageUrl) {
    return { ...baseAdapter(id, [
      { selector: '.list-films', position: 'before' },
      { selector: '.film-moi', position: 'before' },
      { selector: '#content', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '.list-episode a[href]', doc, pageUrl),
      gestures: true, seamlessNext: id === families.CLASSIC,
    };
  }
