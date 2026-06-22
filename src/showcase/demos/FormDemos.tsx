import React, { FC, useState } from 'react'
import { Form1 } from '../../components/Form1'
import { ParameterTypes } from '../../components/Form1/types'
import { DemoCard } from '../DemoCard'

interface DemoFormState {
    label: string
    count: number
    enabled: boolean
}

export const Form1BasicDemo: FC = () => {
    const [value, setValue] = useState<DemoFormState>({
        label: 'demo',
        count: 3,
        enabled: true,
    })

    return (
        <DemoCard
            title="Form1"
            usedIn="формы параметров доски, фигур, событий"
            state={value}
        >
            <Form1<DemoFormState>
                value={value}
                onChange={setValue}
                fieldLayout="labeled"
                config={[
                    {
                        name: 'label',
                        label: 'label',
                        type: ParameterTypes.TextInput,
                        props: { placeholder: 'text' },
                    },
                    {
                        name: 'count',
                        label: 'n',
                        type: ParameterTypes.NumberInput,
                        props: { min: 0, max: 100, step: 1 },
                    },
                    {
                        name: 'enabled',
                        label: 'on',
                        type: ParameterTypes.Checkbox,
                        props: { text: 'enabled' },
                    },
                ]}
            />
        </DemoCard>
    )
}
