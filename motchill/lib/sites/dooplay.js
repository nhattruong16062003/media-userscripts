  function dooAdapter(doc, pageUrl) {
    return baseAdapter(families.DOO, [
      { selector: '#contenedor .module', position: 'before' },
      { selector: '#contenedor .content', position: 'prepend' },
      { selector: '#contenedor', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '.episodiotitle a[href],.episodios a[href],a[href*="/xem-phim/"]', doc, pageUrl);
  }
