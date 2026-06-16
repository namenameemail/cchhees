export class CopyParamsService<T> {
    value?: T

    setValue = (value?: T) => {
        this.value = value
    }

    getValue = () => {
        return this.value
    }
}
