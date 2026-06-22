import { FC } from 'react'
import {
    ConditionSubjectDemo,
    FigureFilterArrayDemo,
    FigureStateSelectDemo,
    TeamFiguresPickerDemo,
} from './demos/FigureSelectDemos'
import { Form1BasicDemo } from './demos/FormDemos'
import { ColorAutocompleteDemo, ImageSelectDemo } from './demos/InputDemos'

export interface ShowcaseEntry {
    id: string
    group: string
    title: string
    needsGameShell: boolean
    Demo: FC
}

export const showcaseRegistry: ShowcaseEntry[] = [
    {
        id: 'figure-state-select',
        group: 'Figure select',
        title: 'FigureStateSelect',
        needsGameShell: true,
        Demo: FigureStateSelectDemo,
    },
    {
        id: 'figure-filter-array',
        group: 'Figure select',
        title: 'FigureFilterArrayField',
        needsGameShell: true,
        Demo: FigureFilterArrayDemo,
    },
    {
        id: 'condition-subject',
        group: 'Figure select',
        title: 'ConditionSubjectField',
        needsGameShell: true,
        Demo: ConditionSubjectDemo,
    },
    {
        id: 'team-figures-picker',
        group: 'Figure select',
        title: 'TeamFiguresPicker',
        needsGameShell: true,
        Demo: TeamFiguresPickerDemo,
    },
    {
        id: 'form1-basic',
        group: 'Form',
        title: 'Form1',
        needsGameShell: false,
        Demo: Form1BasicDemo,
    },
    {
        id: 'color-autocomplete',
        group: 'Inputs',
        title: 'ColorAutocompleteInput',
        needsGameShell: false,
        Demo: ColorAutocompleteDemo,
    },
    {
        id: 'image-select',
        group: 'Inputs',
        title: 'ImageSelect',
        needsGameShell: false,
        Demo: ImageSelectDemo,
    },
]

export const showcaseGroups = [...new Set(showcaseRegistry.map(entry => entry.group))]

export function getShowcaseEntry(id: string | null): ShowcaseEntry {
    return showcaseRegistry.find(entry => entry.id === id) ?? showcaseRegistry[0]!
}

export function getDefaultShowcaseId(): string {
    return showcaseRegistry[0]!.id
}
