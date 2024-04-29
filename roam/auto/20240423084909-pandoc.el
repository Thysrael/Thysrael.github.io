(TeX-add-style-hook
 "20240423084909-pandoc"
 (lambda ()
   (TeX-add-to-alist 'LaTeX-provided-class-options
                     '(("article" "12pt" "a4paper")))
   (TeX-add-to-alist 'LaTeX-provided-package-options
                     '(("xeCJK" "slantfont" "boldfont") ("geometry" "a4paper") ("inputenc" "utf8") ("fontenc" "T1") ("ulem" "normalem") ("tcolorbox" "breakable" "xparse")))
   (add-to-list 'LaTeX-verbatim-environments-local "VerbatimBuffer")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbatimWrite")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbEnv")
   (add-to-list 'LaTeX-verbatim-environments-local "SaveVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbatimOut")
   (add-to-list 'LaTeX-verbatim-environments-local "LVerbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "LVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "BVerbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "BVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "Verbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "Verbatim")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "href")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperimage")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperbaseurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "nolinkurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "url")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "path")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "Verb")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "Verb*")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "EscVerb")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "EscVerb*")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "path")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "Verb*")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "Verb")
   (TeX-run-style-hooks
    "latex2e"
    "article"
    "art12"
    "fontenc"
    "xeCJK"
    "geometry"
    "fvextra"
    "booktabs"
    "tikz"
    "inputenc"
    "graphicx"
    "longtable"
    "wrapfig"
    "rotating"
    "ulem"
    "amsmath"
    "amssymb"
    "capt-of"
    "hyperref"
    "xcolor"
    "tcolorbox"
    "float")
   (TeX-add-symbols
    '("EFANm" 1)
    '("EFANw" 1)
    '("EFANc" 1)
    '("EFANB" 1)
    '("EFANg" 1)
    '("EFANb" 1)
    '("EFANr" 1)
    '("EFANy" 1)
    '("EFanm" 1)
    '("EFanw" 1)
    '("EFanc" 1)
    '("EFanB" 1)
    '("EFang" 1)
    '("EFanb" 1)
    '("EFanr" 1)
    '("EFany" 1)
    '("EFrdi" 1)
    '("EFrdh" 1)
    '("EFrdg" 1)
    '("EFrdf" 1)
    '("EFrde" 1)
    '("EFrdd" 1)
    '("EFrdc" 1)
    '("EFrdb" 1)
    '("EFrda" 1)
    '("EFhs" 1)
    '("EFhq" 1)
    '("EFhn" 1)
    '("EFOh" 1)
    '("EFOg" 1)
    '("EFOf" 1)
    '("EFOe" 1)
    '("EFOd" 1)
    '("EFOc" 1)
    '("EFOb" 1)
    '("EFOa" 1)
    '("EFobe" 1)
    '("EFobb" 1)
    '("EFob" 1)
    '("EFrb" 1)
    '("EFrc" 1)
    '("EFpp" 1)
    '("EFnc" 1)
    '("EFwr" 1)
    '("EFo" 1)
    '("EFt" 1)
    '("EFv" 1)
    '("EFf" 1)
    '("EFb" 1)
    '("EFk" 1)
    '("EFm" 1)
    '("EFd" 1)
    '("EFs" 1)
    '("EFcd" 1)
    '("EFc" 1)
    '("EFhi" 1)
    '("EFlv" 1)
    '("EFl" 1)
    '("EFe" 1)
    '("EFw" 1)
    '("EFsc" 1)
    '("EFh" 1)
    '("EFvp" 1)
    '("EFD" 1)
    '("texttt" 1)
    "listingsname"
    "listoflistingsname"
    "listoflistings"
    "efstrut"
    "oldtexttt")
   (LaTeX-add-labels
    "sec:org9630c0d"
    "sec:org0ffa704"
    "sec:orgd089484"
    "sec:org1329760")
   (LaTeX-add-xcolor-definecolors
    "EfD"
    "EFD"
    "EFvp"
    "EFh"
    "EFsc"
    "EFw"
    "EFe"
    "EFl"
    "EFlv"
    "EFhi"
    "EFc"
    "EFcd"
    "EFs"
    "EFd"
    "EFm"
    "EFk"
    "EFb"
    "EFf"
    "EFv"
    "EFt"
    "EFo"
    "EFwr"
    "EFpp"
    "EFOa"
    "EFOb"
    "EFOc"
    "EFOd"
    "EFOe"
    "EFOf"
    "EFOg"
    "EFOh"
    "EFhn"
    "EFhq"
    "EFhs"
    "EFrda"
    "EFrdb"
    "EFrdc"
    "EFrdd"
    "EFrde"
    "EFrdf"
    "EFrdg"
    "EFrdh"
    "EFrdi"
    "EFany"
    "EFanr"
    "EFanb"
    "EFang"
    "EFanB"
    "EFanc"
    "EFanw"
    "EFanm"
    "EFANy"
    "EFANr"
    "EFANg"
    "EFANB"
    "EFANc"))
 :latex)

