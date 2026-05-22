export const svgToDataURL = svgStr => {
    const encoded = encodeURIComponent(svgStr)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22')


    return 'data:image/svg+xml,' + encoded
}