'use client'
import React, { useState } from 'react'
import { FlowInputVariable, FlowInputType } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Lista do wyboru w <select> */
const INPUT_TYPES: FlowInputType[] = [
  'shortText',
  'url',
  'longText',
  'number',
  'json',
  'fileBase64',
]

// Prosty regex do walidacji nazwy zmiennej:
const variableNameRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

interface FlowInputVariablesEditorProps {
  variables: FlowInputVariable[]
  onChange: (updated: FlowInputVariable[]) => void
}

export function FlowInputVariablesEditor({
  variables,
  onChange,
}: FlowInputVariablesEditorProps) {
  // Funkcja tworząca nową zmienną z wartościami domyślnymi
  const createNewVariable = (): FlowInputVariable => ({
    name: '',
    description: '',
    required: false,
    type: 'shortText',
  })

  // Dodawanie nowej zmiennej
  const handleAddVariable = () => {
    onChange([...variables, createNewVariable()])
  }

  // Usuwanie zmiennej
  const handleDeleteVariable = (index: number) => {
    const updated = variables.filter((_, i) => i !== index)
    onChange(updated)
  }

  // Aktualizowanie pól w istniejącej zmiennej
  const updateVariable = (index: number, updatedFields: Partial<FlowInputVariable>) => {
    const newList = [...variables]
    newList[index] = { ...newList[index], ...updatedFields }
    onChange(newList)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Edytor danych wejściowych (zmienne)</h2>

      <div className="space-y-4">
        {variables.map((variable, index) => {
          // Będziemy walidować nazwę zmiennej
          const isNameValid = variable.name === '' || variableNameRegex.test(variable.name)

          return (
            <Card key={index} className="p-4 border space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Zmienna #{index + 1}</div>
                <Button variant="destructive" onClick={() => handleDeleteVariable(index)}>
                  Usuń
                </Button>
              </div>

              {/* Nazwa zmiennej */}
              <div>
                <Label className="block text-sm">Nazwa (TS symbol):</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder="np. userEmail"
                />
                {!isNameValid && (
                  <p className="text-red-500 text-sm mt-1">
                    Nazwa nie jest poprawnym symbolem (np. userEmail, _count, $value).
                  </p>
                )}
              </div>

              {/* Opis */}
              <div>
                <Label className="block text-sm">Opis (opcjonalny):</Label>
                <Input
                  value={variable.description || ''}
                  onChange={(e) => updateVariable(index, { description: e.target.value })}
                  placeholder="np. Email użytkownika do wysyłki..."
                />
              </div>

              {/* Typ */}
              <div>
                <Label className="block text-sm">Typ:</Label>
                <select
                  className="border p-1 rounded"
                  value={variable.type}
                  onChange={(e) =>
                    updateVariable(index, { type: e.target.value as FlowInputType })
                  }
                >
                  {INPUT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <div className="flex items-center gap-2">
                <input
                  id={`required-checkbox-${index}`}
                  type="checkbox"
                  checked={variable.required}
                  onChange={(e) => updateVariable(index, { required: e.target.checked })}
                />
                <Label htmlFor={`required-checkbox-${index}`}>Wymagana</Label>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-4">
        <Button onClick={handleAddVariable}>Dodaj zmienną</Button>
      </div>
    </div>
  )
}
